import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('provider')
export class ProviderController {
  constructor(private service: ProviderService) {}

  @Post('setup')
  setup(@CurrentUser() user: any, @Body() dto: UpdateProviderDto) {
    return this.service.setup(user.userId, dto);
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.service.getMe(user.userId);
  }

  @Put('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProviderDto) {
    return this.service.updateMe(user.userId, dto);
  }

  @Get('me/bookings')
  getBookings(@CurrentUser() user: any) {
    return this.service.getMyBookings(user.userId);
  }

  @Patch('me/bookings/:id/status')
  updateBookingStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateBookingStatus(user.userId, id, status);
  }

  @Get('me/availability')
  getAvailability(@CurrentUser() user: any) {
    return this.service.getMyAvailability(user.userId);
  }

  @Put('me/availability')
  setAvailability(@CurrentUser() user: any, @Body() dto: SetAvailabilityDto) {
    return this.service.setAvailability(user.userId, dto);
  }

  @Get('me/stats')
  getStats(@CurrentUser() user: any) {
    return this.service.getMyStats(user.userId);
  }

  @Get('marketplace/requests')
  getMarketplace(@CurrentUser() user: any, @Query('categoryId') categoryId?: string) {
    return this.service.getMarketplaceRequests(user.userId, categoryId);
  }

  @Post('me/services')
  addService(
    @CurrentUser() user: any,
    @Body() data: {
      categoryId: string;
      name: string;
      description?: string;
      priceType: 'FIXED' | 'QUOTE';
      price?: number;
      duration?: number;
    },
  ) {
    return this.service.addService(user.userId, data);
  }

  @Patch('me/services/:id/toggle')
  toggleService(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.toggleService(user.userId, id);
  }

  @Delete('me/services/:id')
  deleteService(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteService(user.userId, id);
  }
}
