import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+212[0-9]{9}$/, { message: 'Phone must be in format +212XXXXXXXXX' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+212[0-9]{9}$/, { message: 'Phone must be in format +212XXXXXXXXX' })
  phone: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}
