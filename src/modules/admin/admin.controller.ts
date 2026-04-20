import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('users')
  listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.listUsers(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }

  @Get('providers')
  listProviders(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.listProviders(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }

  @Post('providers/:id/approve-kyc')
  approveKyc(@Param('id') id: string) {
    return this.service.approveKyc(id);
  }

  @Post('providers/:id/reject-kyc')
  rejectKyc(@Param('id') id: string, @Body('note') note: string) {
    return this.service.rejectKyc(id, note);
  }

  @Get('bookings')
  listBookings(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.listBookings(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }
}
