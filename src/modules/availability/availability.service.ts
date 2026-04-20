import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_DAILY_SLOTS = 8;

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAvailability(providerId: string, year: number, month: number) {
    const provider = await this.prisma.providerAccount.findFirst({
      where: { id: providerId, kycStatus: 'APPROVED' },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const recurringRules = await this.prisma.availability.findMany({
      where: { providerId, type: 'RECURRING' },
    });

    const exceptions = await this.prisma.availability.findMany({
      where: {
        providerId,
        type: 'EXCEPTION',
        date: { gte: startDate, lte: endDate },
      },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        providerId,
        scheduledDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledDate: true },
    });

    const bookedCounts: Record<string, number> = {};
    for (const b of bookings) {
      const key = b.scheduledDate.toISOString().slice(0, 10);
      bookedCounts[key] = (bookedCounts[key] || 0) + 1;
    }

    const days: Array<{ date: string; available: boolean }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayOfWeek = current.getDay();

      const exception = exceptions.find(
        (e) => e.date && e.date.toISOString().slice(0, 10) === dateStr,
      );

      let available = false;
      if (exception) {
        available = !exception.isOff;
      } else {
        const rule = recurringRules.find((r) => r.dayOfWeek === dayOfWeek);
        available = !!rule && !rule.isOff;
      }

      if (available && (bookedCounts[dateStr] || 0) >= MAX_DAILY_SLOTS) {
        available = false;
      }

      days.push({ date: dateStr, available });
      current.setDate(current.getDate() + 1);
    }

    return { providerId, year, month, days };
  }

  async getDailySlots(providerId: string, dateStr: string) {
    const provider = await this.prisma.providerAccount.findFirst({
      where: { id: providerId, kycStatus: 'APPROVED' },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    const exception = await this.prisma.availability.findFirst({
      where: { providerId, type: 'EXCEPTION', date },
    });

    let startTime = '08:00';
    let endTime = '18:00';

    if (exception) {
      if (exception.isOff) return { date: dateStr, slots: [] };
      if (exception.startTime) startTime = exception.startTime;
      if (exception.endTime) endTime = exception.endTime;
    } else {
      const rule = await this.prisma.availability.findFirst({
        where: { providerId, type: 'RECURRING', dayOfWeek },
      });
      if (!rule || rule.isOff) return { date: dateStr, slots: [] };
      if (rule.startTime) startTime = rule.startTime;
      if (rule.endTime) endTime = rule.endTime;
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        providerId,
        scheduledDate: date,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledSlot: true },
    });

    const bookedSlots = new Set(bookings.map((b) => b.scheduledSlot));
    const slots: Array<{ time: string; available: boolean }> = [];

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m < endMinutes; m += 60) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      const time = `${h}:${min}`;
      slots.push({ time, available: !bookedSlots.has(time) });
    }

    return { date: dateStr, slots };
  }
}
