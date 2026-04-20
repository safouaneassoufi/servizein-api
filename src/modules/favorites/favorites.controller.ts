import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @Get()
  getAll(@CurrentUser() user: any) {
    return this.service.getAll(user.userId);
  }

  @Post(':providerId')
  toggle(@CurrentUser() user: any, @Param('providerId') providerId: string) {
    return this.service.toggle(user.userId, providerId);
  }

  @Get(':providerId/status')
  status(@CurrentUser() user: any, @Param('providerId') providerId: string) {
    return this.service.isFavorited(user.userId, providerId);
  }

  @Delete(':providerId')
  remove(@CurrentUser() user: any, @Param('providerId') providerId: string) {
    return this.service.remove(user.userId, providerId);
  }
}
