import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 12);
  
  const user = await prisma.userAccount.upsert({
    where: { phone: '+212661234567' },
    update: {},
    create: {
      phone: '+212661234567',
      name: 'Mohammed El Plombier',
      passwordHash: hash,
      roles: ['PROVIDER'],
      status: 'ACTIVE',
      phoneVerified: true,
    },
  });

  const provider = await prisma.providerAccount.upsert({
    where: { userId: user.id },
    update: { kycStatus: 'APPROVED', verified: true, available: true },
    create: {
      userId: user.id,
      bio: "Plombier professionnel avec 10 ans d'expérience à Casablanca.",
      experience: 10,
      kycStatus: 'APPROVED',
      verified: true,
      available: true,
      city: 'Casablanca',
      zone: 'Maarif',
      averageRating: 4.8,
      reviewCount: 47,
      completedJobs: 120,
    },
  });

  await prisma.service.upsert({
    where: { id: 'test-service-plomberie' },
    update: {},
    create: {
      id: 'test-service-plomberie',
      providerId: provider.id,
      categoryId: 'seed-cat-plomberie',
      name: "Réparation fuite d'eau",
      description: 'Détection et réparation de fuites, robinets, tuyaux.',
      priceType: 'FIXED',
      price: 200,
      duration: 90,
      active: true,
    },
  });

  console.log('Provider seeded:', provider.id, 'name:', user.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
