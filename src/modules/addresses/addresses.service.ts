import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault ?? existingCount === 0;

    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { ...dto, userId, isDefault },
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException();

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async remove(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException();

    await this.prisma.address.delete({ where: { id: addressId } });

    // Promote oldest remaining to default
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted' };
  }

  async autocomplete(query: string) {
    const token = this.config.get<string>('MAPBOX_ACCESS_TOKEN');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=ma&language=fr&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    return (data.features || []).map((f: any) => ({
      label: f.place_name,
      longitude: f.center[0],
      latitude: f.center[1],
    }));
  }
}
