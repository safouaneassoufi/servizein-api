import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio');

const DEV_OTP = '123456';
const DEV_OTP_TTL = 600;

@Injectable()
export class OtpService {
  private client: ReturnType<typeof twilio>;
  private serviceSid: string;
  private isDev: boolean;

  constructor(
    private config: ConfigService,
    private redis: RedisService,
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') === 'development';
    this.client = twilio(
      this.config.get<string>('TWILIO_ACCOUNT_SID')!,
      this.config.get<string>('TWILIO_AUTH_TOKEN')!,
    );
    this.serviceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID')!;
  }

  async sendOtp(phone: string): Promise<void> {
    if (this.isDev) {
      await this.redis.set(`dev_otp:${phone}`, DEV_OTP, DEV_OTP_TTL);
      console.log(`[DEV] OTP for ${phone}: ${DEV_OTP}`);
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
