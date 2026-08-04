import { PrismaClient } from '../src/generated/prisma/client.js'

import { getDatabaseUrl } from '../src/database-url.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })

  const categories = [
    { name: 'Vivienda', normalizedName: 'vivienda', icon: 'House', color: '#5B5BD6' },
    { name: 'Servicios', normalizedName: 'servicios', icon: 'Zap', color: '#F2A65A' },
    { name: 'Alimentación', normalizedName: 'alimentacion', icon: 'ShoppingBasket', color: '#2DBA9A' },
    { name: 'Transporte', normalizedName: 'transporte', icon: 'Bus', color: '#5B8DEF' },
    { name: 'Salud', normalizedName: 'salud', icon: 'HeartPulse', color: '#E56872' },
    { name: 'Suscripciones', normalizedName: 'suscripciones', icon: 'RefreshCw', color: '#9467D8' },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { normalizedName: category.normalizedName },
      update: {},
      create: category,
    })
  }

  console.log(`✅ Ready with ${categories.length} starter categories`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
