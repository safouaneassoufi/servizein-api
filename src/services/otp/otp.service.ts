import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio');

const DEV_OTP = '123456';
const DEV_OTP_TTL = 600;

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

    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
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
    if (this.isDev) {
      await this.redis.set(`dev_otp:${phone}`, DEV_OTP, DEV_OTP_TTL);
      this.logger.log(`[DEV] OTP for ${phone}: ${DEV_OTP}`);
      return;
    }
    if (!this.client) {
      this.logger.warn('Twilio not initialized — cannot send OTP');
      return;
    }
    await this.client.verify.v2
      .services(this.serviceSid)
      .verifications.create({ to: phone, channel: 'sms' });
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (this.isDev) {
      const stored = await this.redis.get(`dev_otp:${phone}`);
      if (stored === code) {
        await this.redis.del(`dev_otp:${phone}`);
        return true;
      }
      return false;
    }
    if (!this.client) return false;
    try {
      const result = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: phone, code });
      return result.status === 'approved';
    } catch {
      return false;
    }
  }
}
