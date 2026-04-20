import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private service: BookingsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(user.userId, id, reason);
  }
}
