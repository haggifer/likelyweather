import { City, CityDetail, CityStatus, GeocodeResult, Locale, LOCALES } from '@fa/shared/api'
import { DAY_MS } from '@fa/shared/constants'
import { slugify } from '@fa/shared/seeds'
import { floorToStep, toIsoMinute } from '@fa/shared/time'
import { dedupe } from './cache'
import { collect, getRunId } from './collector'
import { env } from './env'
import { HttpError } from './errors'
import { quotaExceeded, trySpendQuota } from './quota'
import { getPlace } from './sources/geocoding'
import { getCities, getCityBySlug, getLatestSnapshotMeta, SnapshotMeta, updateCities } from './store'

const countActive = (cities: City[]) => cities.filter((c) => c.status === CityStatus.Active).length

const checkReactivatedStatus = (cities: City[]) =>
    countActive(cities) < env.ACTIVE_CITY_CAP ? CityStatus.Active : CityStatus.Queued

const findCity = async (id: number) => {
    const cities = await getCities()

    return cities.find((c) => c.id === id)
}

const getLocalNames = (places: (GeocodeResult | null)[]) =>
    Object.fromEntries(
        LOCALES.map((locale, i) => [locale, places[i]?.name]).filter(([locale, name]) => locale !== Locale.En && name),
    ) as Partial<Record<Locale, string>>

const toTrackedCity = (
    place: GeocodeResult,
    nameLocal: Partial<Record<Locale, string>>,
    status: CityStatus,
    now: string,
): City => ({
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
    status,
    availableModels: [],
    firstTrackedAt: now,
    lastViewedAt: now,
    viewCount: 0,
    runsCollected: 0,
})

const markDormant = (cities: City[], dormantBefore: number) =>
    cities.map((city) =>
        city.status === CityStatus.Active && new Date(city.lastViewedAt).getTime() < dormantBefore
            ? { ...city, status: CityStatus.Dormant }
            : city,
    )

const promoteQueued = (cities: City[]) => {
    let free = env.ACTIVE_CITY_CAP - countActive(cities)

    return cities.map((city) => {
        if (city.status !== CityStatus.Queued || free <= 0) return city

        free--

        return { ...city, status: CityStatus.Active }
    })
}

export const requireCity = async (slug: string) => {
    const city = await getCityBySlug(slug)

    if (!city) throw new HttpError(404, 'city_not_found', `No tracked city with slug "${slug}"`)

    return city
}

export const trackCity = async (geocodeId: number) => {
    const existing = await findCity(geocodeId)

    if (existing) return existing

    const places = await Promise.all(LOCALES.map((locale) => getPlace(geocodeId, locale)))
    const place = places[LOCALES.indexOf(Locale.En)]

    if (!place) throw new HttpError(404, 'place_not_found', `Geocoding id ${geocodeId} not found`)

    const nameLocal = getLocalNames(places)
    const now = new Date().toISOString()
    let created: City | undefined

    await updateCities((cities) => {
        if (cities.some((c) => c.id === geocodeId)) return cities

        created = toTrackedCity(place, nameLocal, checkReactivatedStatus(cities), now)

        return [...cities, created]
    })

    if (created) return created

    const tracked = await findCity(geocodeId)

    return tracked!
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
                status: city.status === CityStatus.Dormant ? checkReactivatedStatus(cities) : city.status,
            }

            return viewed
        }),
    )

    return viewed
}

export const applyDormancy = (now = new Date()) =>
    updateCities((cities) => {
        const dormantBefore = now.getTime() - env.DORMANT_AFTER_DAYS * DAY_MS

        return promoteQueued(markDormant(cities, dormantBefore))
    })

// A city whose newest snapshot predates the current 6-hour run is refreshed through the collector's preview path.
// This stands in for the scheduler locally: views never wait more than one upstream round trip. A refresh on behalf
// of a `client` spends its daily quota; with none left the stored snapshot is served as it is. Concurrent views share
// one refresh, paid by the first.
export const ensureFreshSnapshot = (city: City, client?: string): Promise<SnapshotMeta> =>
    dedupe(`refresh:${city.id}`, async () => {
        const snapshot = await getLatestSnapshotMeta(city.id)
        const currentIssue = toIsoMinute(floorToStep(new Date()))

        if (snapshot && snapshot.issueTime >= currentIssue) return snapshot

        if (client) {
            const hasQuota = await trySpendQuota(client)

            if (!hasQuota && snapshot) return snapshot

            if (!hasQuota) throw quotaExceeded()
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
    const snapshot = await getLatestSnapshotMeta(city.id)

    return { ...city, latestIssueTime: snapshot?.issueTime ?? null, isPreviewOnly: city.runsCollected === 0 }
}
