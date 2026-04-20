import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getServices(categoryId?: string, priceType?: string) {
    const where: any = { active: true, providerId: null };
    if (categoryId) where.categoryId = categoryId;
    if (priceType) where.priceType = priceType;
    return this.prisma.service.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
