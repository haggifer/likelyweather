import { City, CityStatus } from '@fa/shared/api'
import { SEEDS, slugify } from '@fa/shared/seeds'

const SEED_EPOCH = '2026-09-23T00:00:00.000Z'

export const SEED_CITIES: City[] = SEEDS.map((seed) => ({
    ...seed,
    slug: slugify(seed.name, seed.countryCode, seed.id),
    status: CityStatus.Active,
    availableModels: [],
    firstTrackedAt: SEED_EPOCH,
    lastViewedAt: SEED_EPOCH,
    viewCount: 0,
    runsCollected: 0,
}))

// Adds seeds that are missing (e.g. a seed introduced after the store was created) and fills in localized
// names for newer locales, without touching tracking state.
export const mergeSeeds = (cities: City[]) => {
    const byId = new Map(SEED_CITIES.map((c) => [c.id, c]))
    const merged = cities.map((city) => {
        const seed = byId.get(city.id)
        return seed ? { ...city, nameLocal: { ...seed.nameLocal, ...city.nameLocal } } : city
    })
    const missing = SEED_CITIES.filter((seed) => !cities.some((c) => c.id === seed.id))

    return [...merged, ...missing]
}
