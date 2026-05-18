import { Global, Module } from '@nestjs/common';
import { OtpService } from './otp.service';

@Global()
@Module({
  providers: [OtpService],  // RedisService retiré — OTP fixe sans Redis
  exports: [OtpService],
})
export class OtpModule {}
