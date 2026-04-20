import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private service: RequestsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRequestDto) {
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
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.cancel(user.userId, id);
  }
}
