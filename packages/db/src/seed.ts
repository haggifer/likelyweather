import { getPrisma } from './client'
import { SEED_CITIES, SEED_MODELS } from './seedData'

// Idempotent: models are overwritten from the shared palette; seed cities are created once and keep their tracking
// state, but pick up names added for newer locales.
const main = async () => {
    const prisma = getPrisma()

    for (const model of SEED_MODELS) {
        await prisma.model.upsert({ where: { id: model.id }, create: model, update: model })
    }

    for (const city of SEED_CITIES) {
        await prisma.city.upsert({ where: { id: city.id }, create: city, update: { nameLocal: city.nameLocal } })
    }

    console.log(`Seeded ${SEED_MODELS.length} models and ${SEED_CITIES.length} cities`)
    await prisma.$disconnect()
}

void main()
