import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';

const OFFER_INCLUDE = {
  request: {
    include: {
      category: { select: { id: true, name: true, icon: true } },
      client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
    },
  },
  provider: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
};

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOfferDto) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');
    if (provider.kycStatus !== 'APPROVED') {
      throw new ForbiddenException('KYC must be approved to send offers');
    }

    const request = await this.prisma.serviceRequest.findFirst({
      where: { id: dto.requestId, status: 'OPEN' },
    });
    if (!request) throw new NotFoundException('Request not found or no longer open');

    const existing = await this.prisma.offer.findUnique({
      where: { requestId_providerId: { requestId: dto.requestId, providerId: provider.id } },
    });
    if (existing) throw new ConflictException('You already sent an offer for this request');

    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h default

    const offer = await this.prisma.offer.create({
      data: {
        requestId: dto.requestId,
        providerId: provider.id,
        price: dto.price,
        message: dto.message,
        proposedDate: dto.proposedDate ? new Date(dto.proposedDate) : undefined,
        proposedSlot: dto.proposedSlot,
        estimatedHours: dto.estimatedHours,
        validUntil,
        status: 'PENDING',
      },
      include: OFFER_INCLUDE,
    });

    // Mark request as QUOTED
    await this.prisma.serviceRequest.update({
      where: { id: dto.requestId },
      data: { status: 'QUOTED' },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: request.clientId,
        type: 'QUOTE_RECEIVED',
        title: 'Nouvelle offre reçue',
        body: `Un prestataire a proposé ${dto.price} MAD pour votre demande`,
        data: { offerId: offer.id, requestId: dto.requestId },
      },
    });

    return offer;
  }

  async findMyOffers(userId: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    return this.prisma.offer.findMany({
      where: { providerId: provider.id },
      include: OFFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider account not found');

    const offer = await this.prisma.offer.findFirst({
      where: { id, providerId: provider.id },
      include: OFFER_INCLUDE,
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async withdraw(userId: string, id: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider not found');

    const offer = await this.prisma.offer.findFirst({
      where: { id, providerId: provider.id },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (!['PENDING', 'SEEN', 'COUNTER_OFFERED'].includes(offer.status)) {
      throw new BadRequestException('Cannot withdraw this offer');
    }

    return this.prisma.offer.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
      include: OFFER_INCLUDE,
    });
  }

  async acceptCounter(userId: string, id: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider not found');

    const offer = await this.prisma.offer.findFirst({
      where: { id, providerId: provider.id, status: 'COUNTER_OFFERED' },
      include: OFFER_INCLUDE,
    });
    if (!offer) throw new NotFoundException('Counter-offer not found');

    const updated = await this.prisma.offer.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        price: offer.counterPrice ?? offer.price,
      },
      include: OFFER_INCLUDE,
    });

    // Update request to ACCEPTED
    await this.prisma.serviceRequest.update({
      where: { id: offer.requestId },
      data: { status: 'ACCEPTED' },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: offer.request.client.id,
        type: 'BOOKING_CONFIRMED',
        title: 'Offre confirmée',
        body: 'Le prestataire a accepté votre contre-offre',
        data: { offerId: id },
      },
    });

    return updated;
  }

  async rejectCounter(userId: string, id: string) {
    const provider = await this.prisma.providerAccount.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider not found');

    const offer = await this.prisma.offer.findFirst({
      where: { id, providerId: provider.id, status: 'COUNTER_OFFERED' },
    });
    if (!offer) throw new NotFoundException('Counter-offer not found');

    return this.prisma.offer.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: OFFER_INCLUDE,
    });
  }
}
