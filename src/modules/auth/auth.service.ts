import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../services/redis/redis.service';
import { OtpService } from '../../services/otp/otp.service';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

interface AppleTokenPayload {
  sub: string;       // Apple user ID (stable per app)
  email?: string;    // Only on first login, or if user chose to share
  email_verified?: string | boolean;
  aud: string;       // Must match CLIENT_ID
}

const OTP_RATE_LIMIT = 5;
const OTP_WINDOW_SECONDS = 3600;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private otp: OtpService,
    private firebase: FirebaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.userAccount.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });
    if (existing) throw new ConflictException('Phone or email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.userAccount.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        name: dto.name,
        passwordHash,
        roles: ['CLIENT'],
        status: 'PENDING_VERIFICATION',
      },
    });

    await this.sendOtp(dto.phone);
    return { message: 'OTP sent', userId: user.id };
  }

  async sendOtp(phone: string) {
    const rateKey = `otp_rate:${phone}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, OTP_WINDOW_SECONDS);
    }
    if (count > OTP_RATE_LIMIT) {
      const ttl = await this.redis.ttl(rateKey);
      throw new HttpException(
        `Too many OTP requests. Try again in ${Math.ceil(ttl / 60)} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.otp.sendOtp(phone);
    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, code: string) {
    const valid = await this.otp.verifyOtp(phone, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    const user = await this.prisma.userAccount.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('User not found');

    const updated = await this.prisma.userAccount.update({
      where: { id: user.id },
      data: { phoneVerified: true, status: 'ACTIVE' },
    });

    return this.issueTokenPair(updated.id, updated.roles);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.userAccount.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.phoneVerified) throw new UnauthorizedException('Phone not verified');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokenPair(user.id, user.roles);
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const storedToken = await this.redis.get(`refresh:${payload.sub}:${payload.jti}`);
    if (!storedToken) throw new UnauthorizedException('Refresh token revoked');

    await this.redis.del(`refresh:${payload.sub}:${payload.jti}`);

    const user = await this.prisma.userAccount.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();

    return this.issueTokenPair(user.id, user.roles);
  }

  async resetPassword(phone: string, code: string, newPassword: string) {
    const valid = await this.otp.verifyOtp(phone, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    const user = await this.prisma.userAccount.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('User not found');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.userAccount.update({
      where: { id: user.id },
      data: { passwordHash: hash, phoneVerified: true, status: 'ACTIVE' },
    });

    return this.issueTokenPair(user.id, user.roles);
  }

  /**
   * Universal Firebase ID token login.
   * Works for Email/Password, Google, Apple — any Firebase provider.
   * The frontend always sends the Firebase ID token after any Firebase sign-in.
   */
  async firebaseLogin(idToken: string) {
    // 1. Verify token via Firebase Admin SDK
    let decoded: Awaited<ReturnType<typeof this.firebase.verifyIdToken>>;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }

    // 2. Provider-specific validation
    const provider = decoded.firebase?.sign_in_provider ?? '';
    if (provider === 'password' && !decoded.email_verified) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    // 3. Resolve identity fields by provider
    const email = decoded.email ?? null;
    // Phone provider: decoded.phone_number is the verified E.164 number
    const isPhoneProvider = provider === 'phone';
    const verifiedPhone: string | null = isPhoneProvider
      ? (decoded.phone_number ?? null)
      : null;
    // Fallback placeholder for non-phone, non-email providers (Google sets email; Apple sets email on first login)
    const placeholderPhone = `firebase_${decoded.uid}`;

    // 4. Find existing user — try phone first for phone provider, email otherwise
    let user = verifiedPhone
      ? await this.prisma.userAccount.findUnique({ where: { phone: verifiedPhone } })
      : null;

    if (!user && email) {
      user = await this.prisma.userAccount.findFirst({ where: { email } });
    }

    if (!user) {
      user = await this.prisma.userAccount.findFirst({
        where: { phone: placeholderPhone },
      });
    }

    // 5. Create or update
    if (!user) {
      const name =
        decoded.name ??
        email?.split('@')[0] ??
        (verifiedPhone ? verifiedPhone : 'Utilisateur');

      user = await this.prisma.userAccount.create({
        data: {
          email,
          // Use the real phone number if available; otherwise a placeholder
          phone: verifiedPhone ?? placeholderPhone,
          name,
          avatarUrl: decoded.picture ?? null,
          passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
          roles: ['CLIENT'],
          status: 'ACTIVE',
          phoneVerified: isPhoneProvider || true,
          emailVerified: decoded.email_verified ?? false,
        },
      });
    } else if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account suspended');
    } else {
      // Promote placeholder phone to real verified phone if we now have it
      if (verifiedPhone && user.phone !== verifiedPhone) {
        await this.prisma.userAccount.update({
          where: { id: user.id },
          data: { phone: verifiedPhone, phoneVerified: true },
        });
      }
      if (decoded.picture && !user.avatarUrl) {
        await this.prisma.userAccount.update({
          where: { id: user.id },
          data: { avatarUrl: decoded.picture },
        });
      }
    }

    return this.issueTokenPair(user.id, user.roles);
  }

  async appleLogin(data: {
    identityToken: string;
    authorizationCode: string;
    email: string | null;
    fullName: string | null;
  }) {
    // Verify Apple identity token using Apple's public keys endpoint
    let payload: AppleTokenPayload;
    try {
      // Decode JWT header to get kid
      const [headerB64] = data.identityToken.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());

      // Fetch Apple's public keys
      const keysRes = await fetch('https://appleid.apple.com/auth/keys');
      if (!keysRes.ok) throw new Error('Could not fetch Apple public keys');
      const { keys } = await keysRes.json() as { keys: any[] };

      const matchedKey = keys.find((k: any) => k.kid === header.kid);
      if (!matchedKey) throw new Error('No matching Apple public key');

      // Verify using jsonwebtoken directly (RS256)
      const pem = jwkToPem(matchedKey);

      const clientId = this.config.get<string>('APPLE_CLIENT_ID') ?? 'com.servizein.app';

      payload = jsonwebtoken.verify(data.identityToken, pem, {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: 'https://appleid.apple.com',
      }) as AppleTokenPayload;
    } catch (e: any) {
      throw new UnauthorizedException('Invalid Apple token: ' + (e?.message ?? ''));
    }

    const appleUserId = payload.sub;

    // Determine email — Apple only sends it on first login
    // On repeat logins, we look up by apple_<sub> placeholder phone
    const applePhone = `apple_${appleUserId}`;

    // Try find existing user by apple placeholder phone
    let user = await this.prisma.userAccount.findFirst({
      where: { phone: applePhone },
    });

    // Also try by email if provided (edge case: user has email+password account too)
    if (!user && data.email) {
      user = await this.prisma.userAccount.findFirst({
        where: { email: data.email },
      });
    }

    if (!user) {
      // First Apple login → create account
      const name = data.fullName ?? data.email?.split('@')[0] ?? 'Utilisateur';
      user = await this.prisma.userAccount.create({
        data: {
          phone: applePhone,
          email: data.email ?? null,
          name,
          passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
          roles: ['CLIENT'],
          status: 'ACTIVE',
          phoneVerified: true,
          emailVerified: true,
        },
      });
    } else if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account suspended');
    }

    return this.issueTokenPair(user.id, user.roles);
  }

  async googleLogin(idToken: string) {
    // Verify the Google ID token via Google's tokeninfo endpoint (no Firebase Admin needed)
    let payload: GoogleTokenPayload;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!res.ok) throw new Error('Invalid token');
      payload = await res.json() as GoogleTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    // Find or create user — no password needed, no OTP needed
    let user = await this.prisma.userAccount.findFirst({
      where: { email: payload.email },
    });

    if (!user) {
      // First Google login → auto-create account (already verified by Google)
      user = await this.prisma.userAccount.create({
        data: {
          email: payload.email,
          phone: `google_${payload.sub}`, // placeholder — unique per Google account
          name: payload.name,
          avatarUrl: payload.picture,
          passwordHash: await bcrypt.hash(crypto.randomUUID(), 12), // random — never used
          roles: ['CLIENT'],
          status: 'ACTIVE',
          phoneVerified: true,
          emailVerified: true,
        },
      });
    } else if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account suspended');
    }

    return this.issueTokenPair(user.id, user.roles);
  }

  async logout(userId: string, refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.redis.del(`refresh:${userId}:${payload.jti}`);
    } catch {
      // Token already expired/invalid — fine
    }
    return { message: 'Logged out' };
  }

  private async issueTokenPair(userId: string, roles: string[]) {
    const jti = crypto.randomUUID();

    const accessToken = this.jwt.sign(
      { sub: userId, roles, type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES'),
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId, jti, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES'),
      },
    );

    try {
      await this.redis.set(`refresh:${userId}:${jti}`, '1', REFRESH_TTL_SECONDS);
    } catch {
      // Redis unavailable — access token still works; refresh token won't persist
    }

    return { accessToken, refreshToken };
  }
}
