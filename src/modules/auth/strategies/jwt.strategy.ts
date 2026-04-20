import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.type !== 'access') throw new UnauthorizedException();

    const user = await this.prisma.userAccount.findUnique({
      where: { id: payload.sub },
      include: { providerAccount: { select: { id: true } } },
    });

    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();

    return {
      userId: user.id,
      roles: user.roles,
      providerId: user.providerAccount?.id ?? null,
    };
  }
}
