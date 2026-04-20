import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(private service: OffersService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOfferDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findMyOffers(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Patch(':id/withdraw')
  withdraw(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.withdraw(user.userId, id);
  }

  @Patch(':id/accept-counter')
  acceptCounter(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.acceptCounter(user.userId, id);
  }

  @Patch(':id/reject-counter')
  rejectCounter(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.rejectCounter(user.userId, id);
  }
}
