import { IsString, IsNotEmpty, Matches, MinLength, IsOptional, IsEmail } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^\+212[0-9]{9}$/, { message: 'Phone must be in format +212XXXXXXXXX' })
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  password: string;
}
