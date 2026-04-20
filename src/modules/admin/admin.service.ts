import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.userAccount.findMany({
        select: {
          id: true, name: true, phone: true, email: true,
          roles: true, status: true, phoneVerified: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
      }),
      this.prisma.userAccount.count(),
    ]);
    return { items, total };
  }

  async listProviders(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.providerAccount.findMany({
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
      }),
      this.prisma.providerAccount.count(),
    ]);
    return { items, total };
  }

  async approveKyc(providerId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.providerAccount.update({
      where: { id: providerId },
      data: { kycStatus: 'APPROVED', verified: true, available: true },
    });

    await this.prisma.notification.create({
      data: {
        userId: provider.userId,
        type: 'KYC_APPROVED',
        title: 'Profil validé',
        body: 'Votre profil a été approuvé. Vous pouvez maintenant recevoir des réservations.',
      },
    });

    return { message: 'KYC approved' };
  }

  async rejectKyc(providerId: string, note: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.providerAccount.update({
      where: { id: providerId },
      data: { kycStatus: 'REJECTED', kycRejectionNote: note },
    });

    await this.prisma.notification.create({
      data: {
        userId: provider.userId,
        type: 'KYC_REJECTED',
        title: 'Profil rejeté',
        body: `Votre profil n'a pas pu être validé. Raison: ${note}`,
      },
    });

    return { message: 'KYC rejected' };
  }

  async listBookings(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        include: {
          client: { select: { id: true, name: true, phone: true } },
          provider: { include: { user: { select: { id: true, name: true } } } },
          service: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
      }),
      this.prisma.booking.count(),
    ]);
    return { items, total };
  }
}
