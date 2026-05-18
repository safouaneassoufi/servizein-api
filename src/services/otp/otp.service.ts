import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

// OTP fixe — Twilio désactivé (compte trial trop restrictif)
const FIXED_OTP = '123456';
const OTP_TTL  = 600; // 10 minutes

const key = (phone: string) => `otp:${phone}`;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private redis: RedisService) {}

  async sendOtp(phone: string): Promise<void> {
    await this.redis.set(key(phone), FIXED_OTP, OTP_TTL);
    this.logger.log(`OTP pour ${phone} : ${FIXED_OTP}`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(key(phone));
    if (stored === code) {
      await this.redis.del(key(phone));
      return true;
    }
    return false;
  }
}
