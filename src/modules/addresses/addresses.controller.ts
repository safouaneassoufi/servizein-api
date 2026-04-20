import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private service: AddressesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.service.create(user.userId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.userId, id);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.service.autocomplete(q);
  }
}
