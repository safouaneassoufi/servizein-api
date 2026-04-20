import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        provider: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favorites;
  }

  async toggle(userId: string, providerId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { userId_providerId: { userId, providerId } },
      });
      return { favorited: false };
    }

    // verify provider exists
    const provider = await this.prisma.providerAccount.findFirst({
      where: { id: providerId, kycStatus: 'APPROVED' },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.favorite.create({ data: { userId, providerId } });
    return { favorited: true };
  }

  async isFavorited(userId: string, providerId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    return { favorited: !!existing };
  }

  async remove(userId: string, providerId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    if (!existing) throw new NotFoundException('Favorite not found');
    await this.prisma.favorite.delete({
      where: { userId_providerId: { userId, providerId } },
    });
    return { favorited: false };
  }
}
