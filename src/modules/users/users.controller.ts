import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.users.getMe(user.userId);
  }

  @Put('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(user.userId, dto);
  }

  @Put('me/password')
  changePassword(
    @CurrentUser() user: any,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.users.changePassword(user.userId, currentPassword, newPassword);
  }

  @Post('push-token')
  savePushToken(@CurrentUser() user: any, @Body('token') token: string) {
    return this.users.savePushToken(user.userId, token);
  }
}
