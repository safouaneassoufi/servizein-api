import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

const PROVIDER_SELF_SELECT = {
  id: true,
  bio: true,
  experience: true,
  kycStatus: true,
  kycRejectionNote: true,
  verified: true,
  available: true,
  city: true,
  zone: true,
  averageRating: true,
  reviewCount: true,
  completedJobs: true,
  createdAt: true,
  user: {
    select: { id: true, name: true, phone: true, email: true, avatarUrl: true, roles: true },
  },
  services: {
    include: { category: { select: { id: true, name: true, icon: true, slug: true } } },
  },
  documents: true,
  availability: true,
};

@Injectable()
export class ProviderService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const provider = await this.prisma.providerAccount.findUnique({
      where: { userId },
      select: PROVIDER_SELF_SELECT,
    });
    if (!provider) throw new NotFoundException('Provider account not found');
    return provider;
  }

  async setup(userId: string, dto: UpdateProviderDto) {
    const existing = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Provider account already exists');

    // Update user role to include PROVIDER
    await this.prisma.userAccount.update({
      where: { id: userId },
      data: { roles: { push: 'PROVIDER' } },
    });

    return this.prisma.providerAccount.create({
      data: {
        userId,
        bio: dto.bio,
        experience: dto.experience ?? 0,
        city: dto.city,
        zone: dto.zone,
        available: false,
        kycStatus: 'PENDING',
      },
      select: PROVIDER_SELF_SELECT,
    });
  }

  async updateMe(userId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    return this.prisma.providerAccount.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.experience !== undefined && { experience: dto.experience }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.zone !== undefined && { zone: dto.zone }),
        ...(dto.available !== undefined && { available: dto.available }),
      },
      select: PROVIDER_SELF_SELECT,
    });
  }

  async getMyBookings(userId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const bookings = await this.prisma.booking.findMany({
      where: { providerId: provider.id },
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            category: { select: { id: true, name: true, icon: true, slug: true } },
          },
        },
        client: { select: { name: true, avatarUrl: true, phone: true } },
        address: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Expose category at top level for frontend compatibility
    return bookings.map((b) => ({
      ...b,
      category: b.service?.category ?? null,
    }));
  }

  async getMyAvailability(userId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    return this.prisma.availability.findMany({
      where: { providerId: provider.id, type: 'RECURRING' },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    // Replace all RECURRING rules
    await this.prisma.availability.deleteMany({
      where: { providerId: provider.id, type: 'RECURRING' },
    });

    const rules = dto.rules.map((r) => ({
      providerId: provider.id,
      type: 'RECURRING' as const,
      dayOfWeek: r.dayOfWeek,
      isOff: r.isOff,
      startTime: r.startTime,
      endTime: r.endTime,
    }));

    await this.prisma.availability.createMany({ data: rules });
    return this.getMyAvailability(userId);
  }

  async getMyStats(userId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const [bookings, offers] = await Promise.all([
      this.prisma.booking.findMany({
        where: { providerId: provider.id },
        select: { status: true, totalAmount: true, platformFee: true, scheduledDate: true },
      }),
      this.prisma.offer.findMany({
        where: { providerId: provider.id },
        select: { status: true },
      }),
    ]);

    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED');
    const totalEarnings = completed.reduce((sum, b) => sum + b.totalAmount - b.platformFee, 0);

    const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED').length;
    const totalOffers = offers.length;

    return {
      averageRating: provider.averageRating,
      reviewCount: provider.reviewCount,
      completedJobs: provider.completedJobs,
      cancelledJobs: cancelled.length,
      totalEarnings,
      acceptanceRate: totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0,
    };
  }

  async addService(userId: string, data: {
    categoryId: string;
    name: string;
    description?: string;
    priceType: 'FIXED' | 'QUOTE';
    price?: number;
    duration?: number;
  }) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    return this.prisma.service.create({
      data: {
        providerId: provider.id,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        priceType: data.priceType,
        price: data.price,
        duration: data.duration,
        active: true,
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });
  }

  async toggleService(userId: string, serviceId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId: provider.id },
    });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.service.update({
      where: { id: serviceId },
      data: { active: !service.active },
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId: provider.id },
    });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.service.delete({ where: { id: serviceId } });
  }

  async updateBookingStatus(userId: string, bookingId: string, status: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, providerId: provider.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const allowedTransitions: Record<string, string[]> = {
      CONFIRMED: ['PROVIDER_EN_ROUTE', 'CANCELLED'],
      PROVIDER_EN_ROUTE: ['PROVIDER_ARRIVED', 'CANCELLED'],
      PROVIDER_ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
    };

    if (!allowedTransitions[booking.status]?.includes(status)) {
      throw new ConflictException(`Cannot transition from ${booking.status} to ${status}`);
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: status as any,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async getMarketplaceRequests(userId: string, categoryId?: string) {
    const provider = await this.prisma.providerAccount.findUnique({
      where: { userId },
      include: { services: { where: { active: true }, select: { categoryId: true } } },
    });
    if (!provider) throw new NotFoundException('Provider account not found');

    const categoryIds = provider.services.map((s) => s.categoryId);

    return this.prisma.serviceRequest.findMany({
      where: {
        status: 'OPEN',
        ...(categoryId ? { categoryId } : { categoryId: { in: categoryIds } }),
        offers: { none: { providerId: provider.id } },
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        client: { select: { name: true, avatarUrl: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
