/**
 * seed-dev-data.ts
 * Inserts completed bookings + test requests for the dev provider account.
 * Run: ts-node --compiler-options {"module":"CommonJS"} prisma/seed-dev-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs from existing dev data
const PROVIDER_ID = 'cmncaanh70002zgrzws2zu3co';
const CLIENT_ID   = 'cmnca76nb00004iy7gajg4mut';
const ADDRESS_ID  = 'cmncadt1g00024iy7ydtwfrlx';
const SERVICE_ID  = 'test-service-plomberie';
const CAT_PLOMBERIE = 'seed-cat-plomberie';
const CAT_MENAGE    = 'seed-cat-menage';
const CAT_ELECTRICITE = 'seed-cat-electricite';

async function main() {
  console.log('Seeding dev data...');

  // ─── Fix existing CONFIRMED booking: add category via service ───────────────
  // (no change needed — category comes from service join)

  // ─── Completed bookings (for totalEarnings) ──────────────────────────────────
  const completedBookings = [
    { date: new Date('2026-03-01'), amount: 200, fee: 10, service: SERVICE_ID },
    { date: new Date('2026-03-08'), amount: 350, fee: 17.5, service: SERVICE_ID },
    { date: new Date('2026-03-15'), amount: 180, fee: 10, service: SERVICE_ID },
    { date: new Date('2026-03-22'), amount: 500, fee: 25, service: SERVICE_ID },
    { date: new Date('2026-03-29'), amount: 420, fee: 21, service: SERVICE_ID },
    { date: new Date('2026-04-05'), amount: 300, fee: 15, service: SERVICE_ID },
  ];

  for (const b of completedBookings) {
    const providerAmount = b.amount - b.fee;
    await prisma.booking.create({
      data: {
        clientId: CLIENT_ID,
        providerId: PROVIDER_ID,
        serviceId: b.service,
        addressId: ADDRESS_ID,
        status: 'COMPLETED',
        scheduledDate: b.date,
        scheduledSlot: '09:00',
        originalPrice: b.amount,
        finalPrice: b.amount,
        platformFee: b.fee,
        totalAmount: b.amount,
        completedAt: new Date(b.date.getTime() + 2 * 60 * 60 * 1000),
        paymentStatus: 'PAID',
      },
    });
    console.log(`  ✓ Completed booking: ${b.amount} MAD (fee: ${b.fee}, net: ${providerAmount})`);
  }

  // ─── Open service requests (for marketplace) ─────────────────────────────────
  const openRequests = [
    {
      categoryId: CAT_PLOMBERIE,
      description: 'Fuite sous l\'évier de la cuisine, besoin d\'une intervention rapide.',
      city: 'Casablanca',
    },
    {
      categoryId: CAT_MENAGE,
      description: 'Grand ménage après déménagement — appartement 3 pièces à Rabat.',
      city: 'Rabat',
    },
    {
      categoryId: CAT_ELECTRICITE,
      description: 'Panne électrique dans le salon, disjoncteur qui saute souvent.',
      city: 'Casablanca',
    },
    {
      categoryId: CAT_PLOMBERIE,
      description: 'Installation d\'un chauffe-eau — devis souhaité.',
      city: 'Marrakech',
    },
  ];

  for (const req of openRequests) {
    await prisma.serviceRequest.create({
      data: {
        clientId: CLIENT_ID,
        categoryId: req.categoryId,
        description: req.description,
        city: req.city,
        status: 'OPEN',
        photoUrls: [],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  ✓ Open request: ${req.description.slice(0, 50)}...`);
  }

  // ─── Update provider completedJobs to match ──────────────────────────────────
  await prisma.providerAccount.update({
    where: { id: PROVIDER_ID },
    data: {
      completedJobs: 126, // 120 existing + 6 new
    },
  });
  console.log('  ✓ Updated provider completedJobs: 126');

  console.log('\nDev data seed complete.');
  console.log('  totalEarnings will be: ~1,900 MAD (6 completed bookings)');
  console.log('  marketplace requests: 4 open requests');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
