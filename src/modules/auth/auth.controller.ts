import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('firebase')
  firebaseLogin(@Body('idToken') idToken: string) {
    return this.auth.firebaseLogin(idToken);
  }

  @Post('google')
  googleLogin(@Body('idToken') idToken: string) {
    return this.auth.googleLogin(idToken);
  }

  @Post('apple')
  appleLogin(
    @Body('identityToken') identityToken: string,
    @Body('authorizationCode') authorizationCode: string,
    @Body('email') email: string | null,
    @Body('fullName') fullName: string | null,
  ) {
    return this.auth.appleLogin({ identityToken, authorizationCode, email, fullName });
  }

  @Post('reset-password')
  resetPassword(
    @Body('phone') phone: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.auth.resetPassword(phone, code, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: any, @Body() dto: RefreshDto) {
    return this.auth.logout(user.userId, dto.refreshToken);
  }
}
