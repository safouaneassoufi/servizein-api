import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, dto: CreateRequestDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days

    return this.prisma.serviceRequest.create({
      data: {
        clientId,
        categoryId: dto.categoryId,
        description: dto.description,
        photoUrls: dto.photoUrls ?? [],
        city: dto.city,
        expiresAt,
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
  }

  async findAll(clientId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { clientId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(clientId: string, id: string) {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id, clientId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async cancel(clientId: string, id: string) {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id, clientId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!['OPEN', 'QUOTED'].includes(request.status)) {
      throw new ForbiddenException('Cannot cancel this request');
    }
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
