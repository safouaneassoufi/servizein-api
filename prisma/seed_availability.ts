import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.providerAccount.findFirst({
    where: { user: { phone: '+212661234567' } },
  });
  if (!provider) { console.error('Provider not found'); return; }

  // Mon–Sat (1–6), 08:00–18:00
  for (let day = 1; day <= 6; day++) {
    const existing = await prisma.availability.findFirst({
      where: { providerId: provider.id, type: 'RECURRING', dayOfWeek: day },
    });
    if (!existing) {
      await prisma.availability.create({
        data: {
          providerId: provider.id,
          type: 'RECURRING',
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00',
          isOff: false,
        },
      });
    }
  }
  console.log('Availability seeded for provider:', provider.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
