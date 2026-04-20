import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.userAccount.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        roles: true,
        status: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
        providerAccount: {
          select: {
            id: true,
            kycStatus: true,
            verified: true,
            available: true,
            averageRating: true,
            reviewCount: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.userAccount.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Mot de passe mis à jour' };
  }

  async resetPassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.userAccount.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Mot de passe réinitialisé' };
  }

  async savePushToken(userId: string, token: string) {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
    return { message: 'Token enregistré' };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (dto.email) {
      const conflict = await this.prisma.userAccount.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (conflict) throw new ConflictException('Email already in use');
    }

    return this.prisma.userAccount.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        roles: true,
        updatedAt: true,
      },
    });
  }
}
