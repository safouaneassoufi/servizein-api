import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private service: AvailabilityService) {}

  @Get(':providerId/monthly')
  getMonthly(
    @Param('providerId') providerId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.service.getMonthlyAvailability(
      providerId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get(':providerId/daily')
  getDaily(
    @Param('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    return this.service.getDailySlots(providerId, date);
  }
}
