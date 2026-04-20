import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // phone or email

  @IsString()
  @MinLength(8)
  password: string;
}
