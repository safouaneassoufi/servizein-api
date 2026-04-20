import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FeeEngine {
  constructor(private prisma: PrismaService) {}

  async calculate(price: number, categoryId: string): Promise<number> {
    // Try category-specific config first, fall back to platform-level
    const config = await this.prisma.feeConfig.findFirst({
      where: {
        active: true,
        OR: [{ categoryId }, { categoryId: null }],
      },
      orderBy: { categoryId: 'desc' }, // category-specific wins over null
    });

    if (!config) return 0;

    let fee: number;
    if (config.feeType === 'PERCENTAGE') {
      fee = (price * config.value) / 100;
    } else {
      fee = config.value;
    }

    if (config.minFee !== null && fee < config.minFee) fee = config.minFee;
    if (config.maxFee !== null && fee > config.maxFee) fee = config.maxFee;

    return Math.round(fee * 100) / 100;
  }
}
