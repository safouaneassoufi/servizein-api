import { Injectable, Logger } from '@nestjs/common';

// Twilio désactivé — OTP fixe pour tests/demo
// Redis retiré car connexion instable sur ce plan Railway
const FIXED_OTP = '123456';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {}

  async sendOtp(phone: string): Promise<void> {
    this.logger.log(`OTP pour ${phone} : ${FIXED_OTP}`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const ok = code === FIXED_OTP;
    this.logger.log(`verifyOtp ${phone} code=${code} → ${ok}`);
    return ok;
  }
}
