import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderQueryDto } from './dto/provider-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private service: ProvidersService) {}

  @Get()
  findAll(@Query() query: ProviderQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
