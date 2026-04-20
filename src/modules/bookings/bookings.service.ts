import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeeEngine } from './engine/fee.engine';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private feeEngine: FeeEngine,
  ) {}

  async create(clientId: string, dto: CreateBookingDto) {
    // Validate provider
    const provider = await this.prisma.providerAccount.findFirst({
      where: { id: dto.providerId, kycStatus: 'APPROVED', available: true },
    });
    if (!provider) throw new NotFoundException('Provider not available');

    // Validate service (must be FIXED price)
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, active: true },
      include: { category: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.priceType !== 'FIXED' || !service.price) {
      throw new BadRequestException('Only fixed-price services can be booked directly');
    }

    // Validate address ownership
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId: clientId },
    });
    if (!address) throw new ForbiddenException('Address not found');

    // Check slot conflict
    const scheduledDate = new Date(dto.scheduledDate);
    const conflict = await this.prisma.booking.findFirst({
      where: {
        providerId: dto.providerId,
        scheduledDate,
        scheduledSlot: dto.scheduledSlot,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
    });
    if (conflict) throw new BadRequestException('Time slot already booked');

    // Calculate fee
    const platformFee = await this.feeEngine.calculate(service.price, service.categoryId);
    const totalAmount = service.price + platformFee;

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        addressId: dto.addressId,
        source: 'DIRECT',
        status: 'CONFIRMED',
        scheduledDate,
        scheduledSlot: dto.scheduledSlot,
        originalPrice: service.price,
        finalPrice: service.price,
        platformFee,
        totalAmount,
        paymentMethod: (dto.paymentMethod as any) || 'CASH',
        clientNote: dto.clientNote,
      },
      include: {
        service: { select: { name: true, duration: true } },
        provider: { include: { user: { select: { name: true } } } },
        address: true,
      },
    });

    // In-app notification for provider
    await this.prisma.notification.create({
      data: {
        userId: provider.userId,
        type: 'BOOKING_CONFIRMED',
        title: 'Nouvelle réservation',
        body: `Nouvelle réservation pour ${service.name}`,
        data: { bookingId: booking.id },
      },
    });

    return booking;
  }

  async findAll(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: {
        service: { select: { name: true, duration: true, imageUrl: true } },
        provider: {
          include: { user: { select: { name: true, avatarUrl: true } } },
        },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(clientId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId },
      include: {
        service: true,
        provider: { include: { user: { select: { name: true, avatarUrl: true } } } },
        address: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancel(clientId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel booking in current status');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
  }
}
