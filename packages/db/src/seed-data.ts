import { CityStatus } from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { SEEDS, slugify } from '@fa/shared/seeds'

const SEED_EPOCH = new Date('2026-09-23T00:00:00.000Z')

export const SEED_MODELS = MODELS.map((m) => ({
    id: m.id,
    source: m.source,
    name: m.name,
    color: m.color,
    regional: m.isRegional,
}))

export const SEED_CITIES = SEEDS.map((seed) => ({
    ...seed,
    slug: slugify(seed.name, seed.countryCode, seed.id),
    status: CityStatus.Active,
    availableModels: [] as string[],
    firstTrackedAt: SEED_EPOCH,
    lastViewedAt: SEED_EPOCH,
}))
