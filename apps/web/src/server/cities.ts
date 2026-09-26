import { dedupe } from '@/server/cache'
import { collect, getRunId, getWindowSteps, isHourlyGrid } from '@/server/collector'
import { env } from '@/server/env'
import { HttpError } from '@/server/errors'
import { quotaExceeded, trySpendQuota } from '@/server/quota'
import { getPlace } from '@/server/sources/geocoding'
import { getCities, getCityBySlug, getLatestSnapshot, Snapshot, updateCities } from '@/server/store'
import { City, CityDetail, CityStatus, Locale, LOCALES } from '@fa/shared/api'
import { slugify } from '@fa/shared/seeds'
import { floorToStep, toIsoMinute } from '@fa/shared/time'

const DAY_MS = 86_400_000

const countActive = (cities: City[]) => cities.filter((c) => c.status === CityStatus.Active).length

const getReactivatedStatus = (cities: City[]) =>
    countActive(cities) < env.ACTIVE_CITY_CAP ? CityStatus.Active : CityStatus.Queued

export const requireCity = async (slug: string) => {
    const city = await getCityBySlug(slug)

    if (!city) throw new HttpError(404, 'city_not_found', `No tracked city with slug "${slug}"`)

    return city
}

export const trackCity = async (geocodeId: number) => {
    const existing = (await getCities()).find((c) => c.id === geocodeId)

    if (existing) return existing

    const places = await Promise.all(LOCALES.map((locale) => getPlace(geocodeId, locale)))
    const place = places[LOCALES.indexOf(Locale.En)]

    if (!place) throw new HttpError(404, 'place_not_found', `Geocoding id ${geocodeId} not found`)

    const nameLocal = Object.fromEntries(
        LOCALES.map((locale, i) => [locale, places[i]?.name]).filter(([locale, name]) => locale !== Locale.En && name),
    ) as Partial<Record<Locale, string>>
    const now = new Date().toISOString()
    let created: City | undefined

    await updateCities((cities) => {
        if (cities.some((c) => c.id === geocodeId)) return cities

        created = {
            id: place.id,
            slug: slugify(place.name, place.countryCode, place.id),
            name: place.name,
            nameLocal,
            admin1: place.admin1,
            country: place.country,
            countryCode: place.countryCode,
            lat: place.lat,
            lon: place.lon,
            elevationM: place.elevationM,
            timezone: place.timezone,
            population: place.population,
            status: getReactivatedStatus(cities),
            availableModels: [],
            firstTrackedAt: now,
            lastViewedAt: now,
            viewCount: 0,
            runsCollected: 0,
        }
        return [...cities, created]
    })

    return created ?? (await getCities()).find((c) => c.id === geocodeId)!
}

export const recordView = async (slug: string) => {
    let viewed: City | undefined

    await updateCities((cities) =>
        cities.map((city) => {
            if (city.slug !== slug) return city

            viewed = {
                ...city,
                viewCount: city.viewCount + 1,
                lastViewedAt: new Date().toISOString(),
                status: city.status === CityStatus.Dormant ? getReactivatedStatus(cities) : city.status,
            }
            return viewed
        }),
    )

    return viewed
}

export const applyDormancy = (now = new Date()) =>
    updateCities((cities) => {
        const dormantBefore = now.getTime() - env.DORMANT_AFTER_DAYS * DAY_MS
        const next = cities.map((city) =>
            city.status === CityStatus.Active && new Date(city.lastViewedAt).getTime() < dormantBefore
                ? { ...city, status: CityStatus.Dormant }
                : city,
        )
        let free = env.ACTIVE_CITY_CAP - countActive(next)

        return next.map((city) => {
            if (city.status !== CityStatus.Queued || free <= 0) return city

            free--
            return { ...city, status: CityStatus.Active }
        })
    })

const hasFullGrid = (snapshot: Snapshot) => {
    const steps = getWindowSteps(new Date(snapshot.issueTime))

    return isHourlyGrid(snapshot) && snapshot.steps[0] === steps[0] && snapshot.steps.at(-1) === steps.at(-1)
}

// A city whose newest snapshot predates the current 6-hour run, or whose grid is not the current hourly window, is
// refreshed through the collector's preview path. This stands in for the scheduler locally:
// views never wait more than one upstream round trip. A refresh on behalf of a `client` spends its daily quota; with
// none left the stored snapshot is served as it is. Concurrent views share one refresh, paid by the first.
export const ensureFreshSnapshot = (city: City, client?: string) =>
    dedupe(`refresh:${city.id}`, async () => {
        const snapshot = await getLatestSnapshot(city.id)
        const currentIssue = toIsoMinute(floorToStep(new Date()))

        if (snapshot && hasFullGrid(snapshot) && snapshot.issueTime >= currentIssue) return snapshot

        if (client && !trySpendQuota(client)) {
            if (snapshot) return snapshot

            throw quotaExceeded()
        }

        try {
            const { snapshots } = await collect({ origin: 'PREVIEW', cities: [city] })
            return snapshots[0] ?? snapshot
        } catch (error) {
            if (snapshot) return snapshot

            throw error
        }
    })

export const getPreviewRunId = (city: City) => getRunId('PREVIEW', toIsoMinute(floorToStep(new Date())), city.id)

export const toCityDetail = async (city: City): Promise<CityDetail> => {
    const snapshot = await getLatestSnapshot(city.id)

    return { ...city, latestIssueTime: snapshot?.issueTime ?? null, isPreviewOnly: city.runsCollected === 0 }
}
