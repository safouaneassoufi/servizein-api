import { PrismaClient, PriceType } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { slug: 'plomberie', name: 'Plomberie', icon: '🔧', sortOrder: 1 },
  { slug: 'electricite', name: 'Électricité', icon: '⚡', sortOrder: 2 },
  { slug: 'peinture', name: 'Peinture', icon: '🎨', sortOrder: 3 },
  { slug: 'menage', name: 'Ménage', icon: '🧹', sortOrder: 4 },
  { slug: 'jardinage', name: 'Jardinage', icon: '🌿', sortOrder: 5 },
  { slug: 'serrurerie', name: 'Serrurerie', icon: '🔑', sortOrder: 6 },
  { slug: 'climatisation', name: 'Climatisation', icon: '❄️', sortOrder: 7 },
  { slug: 'demenagement', name: 'Déménagement', icon: '📦', sortOrder: 8 },
  { slug: 'informatique', name: 'Informatique', icon: '💻', sortOrder: 9 },
];

const serviceTemplates = [
  // Plomberie
  { categorySlug: 'plomberie', name: 'Débouchage canalisation', priceType: PriceType.FIXED, price: 150, duration: 60 },
  { categorySlug: 'plomberie', name: 'Réparation fuite', priceType: PriceType.FIXED, price: 200, duration: 90 },
  { categorySlug: 'plomberie', name: 'Installation sanitaire', priceType: PriceType.QUOTE, duration: 240 },

  // Electricité
  { categorySlug: 'electricite', name: 'Dépannage électrique', priceType: PriceType.FIXED, price: 180, duration: 60 },
  { categorySlug: 'electricite', name: 'Installation tableau', priceType: PriceType.QUOTE, duration: 300 },

  // Peinture
  { categorySlug: 'peinture', name: 'Peinture chambre', priceType: PriceType.QUOTE, duration: 480 },
  { categorySlug: 'peinture', name: 'Peinture façade', priceType: PriceType.QUOTE },

  // Ménage
  { categorySlug: 'menage', name: 'Ménage domicile (2h)', priceType: PriceType.FIXED, price: 80, duration: 120 },
  { categorySlug: 'menage', name: 'Grand ménage', priceType: PriceType.FIXED, price: 200, duration: 300 },

  // Jardinage
  { categorySlug: 'jardinage', name: 'Tonte pelouse', priceType: PriceType.FIXED, price: 100, duration: 120 },
  { categorySlug: 'jardinage', name: 'Entretien jardin', priceType: PriceType.QUOTE },

  // Serrurerie
  { categorySlug: 'serrurerie', name: 'Ouverture de porte', priceType: PriceType.FIXED, price: 120, duration: 30 },
  { categorySlug: 'serrurerie', name: 'Changement serrure', priceType: PriceType.FIXED, price: 250, duration: 60 },

  // Climatisation
  { categorySlug: 'climatisation', name: 'Entretien clim', priceType: PriceType.FIXED, price: 150, duration: 90 },
  { categorySlug: 'climatisation', name: 'Installation clim', priceType: PriceType.QUOTE },

  // Informatique
  { categorySlug: 'informatique', name: 'Dépannage PC', priceType: PriceType.FIXED, price: 100, duration: 60 },
];

async function main() {
  console.log('Seeding database...');

  // Upsert categories
  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: {
        id: `seed-cat-${cat.slug}`,
        ...cat,
      },
    });
    categoryMap[cat.slug] = created.id;
    console.log(`  Category: ${cat.name}`);
  }

  // Upsert platform service templates (providerId = null)
  for (const svc of serviceTemplates) {
    const categoryId = categoryMap[svc.categorySlug];
    const serviceId = `seed-svc-${svc.categorySlug}-${svc.name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.service.upsert({
      where: { id: serviceId },
      update: {
        name: svc.name,
        priceType: svc.priceType,
        price: svc.price ?? null,
        duration: svc.duration ?? null,
      },
      create: {
        id: serviceId,
        categoryId,
        providerId: null,
        name: svc.name,
        priceType: svc.priceType,
        price: svc.price ?? null,
        duration: svc.duration ?? null,
        active: true,
      },
    });
    console.log(`  Service: ${svc.name}`);
  }

  // Default FeeConfig
  await prisma.feeConfig.upsert({
    where: { id: 'seed-fee-default' },
    update: { value: 5, minFee: 10, maxFee: 50 },
    create: {
      id: 'seed-fee-default',
      categoryId: null,
      feeType: 'PERCENTAGE',
      value: 5,
      minFee: 10,
      maxFee: 50,
      active: true,
    },
  });
  console.log('  FeeConfig: default (5%, min 10, max 50)');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
