import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { FeeEngine } from './engine/fee.engine';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, FeeEngine],
})
export class BookingsModule {}
