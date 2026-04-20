import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private service: CatalogService) {}

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('services')
  getServices(
    @Query('categoryId') categoryId?: string,
    @Query('priceType') priceType?: string,
  ) {
    return this.service.getServices(categoryId, priceType);
  }
}
