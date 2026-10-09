import { SEEDS, slugify } from '@fa/shared/seeds'

const SEED_EPOCH = new Date('2026-09-23T00:00:00.000Z')

export const SEED_CITIES = SEEDS.map((seed) => ({
    ...seed,
    slug: slugify(seed.name, seed.countryCode, seed.id),
    firstTrackedAt: SEED_EPOCH,
}))
