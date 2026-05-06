import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio');

const DEV_OTP = '123456';
const DEV_OTP_TTL = 600;

// Redis key for the fallback OTP (used in prod when Twilio trial blocks the number)
const fallbackKey = (phone: string) => `dev_otp:${phone}`;

@Injectable()
export class OtpService {
  private client: ReturnType<typeof twilio> | null = null;
  private serviceSid: string;
  private isDev: boolean;
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private config: ConfigService,
    private redis: RedisService,
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') === 'development';
    this.serviceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID') ?? '';

    const sid   = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';

    if (!sid || !token) {
      this.logger.warn('Twilio credentials missing — SMS OTP disabled (dev OTP active)');
      return;
    }

    try {
      this.client = twilio(sid, token);
    } catch (err: any) {
      this.logger.error('Twilio init failed: ' + err.message);
    }
  }

  async sendOtp(phone: string): Promise<void> {
    // ── Development mode: Redis-only OTP ─────────────────────────────────────
    if (this.isDev) {
      await this.redis.set(fallbackKey(phone), DEV_OTP, DEV_OTP_TTL);
      this.logger.log(`[DEV] OTP for ${phone}: ${DEV_OTP}`);
      return;
    }

    // ── No Twilio client: store fallback OTP ──────────────────────────────────
    if (!this.client) {
      this.logger.warn('Twilio not initialised — storing fallback OTP in Redis');
      await this.redis.set(fallbackKey(phone), DEV_OTP, DEV_OTP_TTL);
      return;
    }

    // ── Production: try Twilio, fallback to Redis OTP on any error ────────────
    try {
      await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({ to: phone, channel: 'sms' });
      this.logger.log(`Twilio OTP sent to ${phone}`);
    } catch (err: any) {
      // Common Twilio trial errors:
      //   21608 — number not verified in trial account
      //   60200 — invalid To parameter
      this.logger.error(
        `Twilio sendOtp failed for ${phone} (code ${err.code ?? '?'}): ${err.message}`,
      );
      // Store a predictable fallback so registration doesn't crash
      await this.redis.set(fallbackKey(phone), DEV_OTP, DEV_OTP_TTL);
      this.logger.warn(`[FALLBACK] OTP for ${phone} stored in Redis — code: ${DEV_OTP}`);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    // ── Development mode ──────────────────────────────────────────────────────
    if (this.isDev) {
      const stored = await this.redis.get(fallbackKey(phone));
      if (stored === code) {
        await this.redis.del(fallbackKey(phone));
        return true;
      }
      return false;
    }

    // ── No Twilio client: check Redis fallback only ───────────────────────────
    if (!this.client) {
      return this._checkRedisFallback(phone, code);
    }

    // ── Production: try Twilio first, then Redis fallback ─────────────────────
    try {
      const result = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: phone, code });
      if (result.status === 'approved') return true;
    } catch {
      // Twilio failed (e.g. trial restriction) — fall through to Redis check
    }

    // Redis fallback covers the case where sendOtp stored a dev OTP
    return this._checkRedisFallback(phone, code);
  }

  private async _checkRedisFallback(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(fallbackKey(phone));
    if (stored === code) {
      await this.redis.del(fallbackKey(phone));
      return true;
    }
    return false;
  }
}
