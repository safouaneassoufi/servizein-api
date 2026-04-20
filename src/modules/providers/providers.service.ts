import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderQueryDto } from './dto/provider-query.dto';

const PROVIDER_SELECT = {
  id: true,
  bio: true,
  experience: true,
  verified: true,
  available: true,
  city: true,
  zone: true,
  averageRating: true,
  reviewCount: true,
  completedJobs: true,
  user: {
    select: { id: true, name: true, avatarUrl: true },
  },
  services: {
    where: { active: true },
    include: { category: { select: { id: true, name: true, slug: true } } },
  },
};

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProviderQueryDto) {
    const where: any = { kycStatus: 'APPROVED' };

    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.available !== undefined) where.available = query.available;
    if (query.categoryId) {
      where.services = {
        some: { categoryId: query.categoryId, active: true },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.providerAccount.findMany({
        where,
        select: PROVIDER_SELECT,
        orderBy: { averageRating: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.providerAccount.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async findOne(id: string) {
    const provider = await this.prisma.providerAccount.findFirst({
      where: { id, kycStatus: 'APPROVED' },
      select: PROVIDER_SELECT,
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }
}
