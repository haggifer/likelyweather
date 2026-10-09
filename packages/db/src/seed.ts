import { getPrisma } from './client'
import { SEED_CITIES } from './seed-data'

// Idempotent: seed cities are created once, but pick up names added for newer locales.
const main = async () => {
    const prisma = getPrisma()

    for (const city of SEED_CITIES) {
        await prisma.city.upsert({ where: { id: city.id }, create: city, update: { nameLocal: city.nameLocal } })
    }

    console.log(`Seeded ${SEED_CITIES.length} cities`)
    await prisma.$disconnect()
}

void main()
