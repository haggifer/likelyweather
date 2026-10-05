import { City, GeocodeResult, Locale, LOCALES } from '@fa/shared/api'
import { slugify } from '@fa/shared/seeds'
import { floorToStep, isCurrentIssue } from '@fa/shared/time'
import { delay } from 'es-toolkit'
import { claim, dedupe } from './cache'
import { collect } from './collector'
import { getErrorMessage, HttpError } from './errors'
import { quotaExceeded, trySpendQuota } from './quota'
import { pruneExpiredForecasts } from './retention'
import { getPlace } from './sources/geocoding'
import { addCity, getCityById, getCityBySlug, getLatestSnapshotMeta, SnapshotMeta, StoredSnapshotMeta } from './store'

const PARTIAL_RETRY_MS = 15 * 60_000
const REFRESH_CLAIM_SECONDS = 30
const WAIT_POLL_MS = 500
// With the 16.5-second worst case of a fetch, a waiting request still answers inside the 30-second limit.
const WAIT_LIMIT_MS = 12_000

const getLocalNames = (places: (GeocodeResult | null)[]) =>
    Object.fromEntries(
        LOCALES.map((locale, i) => [locale, places[i]?.name]).filter(([locale, name]) => locale !== Locale.En && name),
    ) as Partial<Record<Locale, string>>

const toCity = (place: GeocodeResult, nameLocal: Partial<Record<Locale, string>>): City => ({
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
})

// Retention is housekeeping: a failure is logged and never fails the request that triggered it.
const pruneQuietly = () =>
    pruneExpiredForecasts().catch((error) => console.warn(`Retention failed: ${getErrorMessage(error)}`))

const waitForNewerSnapshot = async (cityId: number, stored: StoredSnapshotMeta | null) => {
    const deadline = Date.now() + WAIT_LIMIT_MS

    while (Date.now() < deadline) {
        await delay(WAIT_POLL_MS)
        const latest = await getLatestSnapshotMeta(cityId)

        if (latest && latest.fetchedAt !== stored?.fetchedAt) return latest
    }

    return stored
}

// Another instance holds the refresh: wait for its snapshot, or serve the stored one when it takes too long.
const waitForRefresh = async (city: City, stored: StoredSnapshotMeta | null) => {
    const latest = await waitForNewerSnapshot(city.id, stored)

    if (!latest) throw new HttpError(503, 'forecast_pending', `The forecast for ${city.name} is still being fetched`)

    return latest
}

// Source failures never throw from `collect`; without any data the stored snapshot is served, or the view fails.
const fetchSnapshot = async (city: City, stored: StoredSnapshotMeta | null): Promise<SnapshotMeta> => {
    try {
        const { snapshot } = await collect({ city })

        await pruneQuietly()

        const latest = snapshot ?? stored

        if (!latest) throw new HttpError(502, 'upstream_error', `No forecast source answered for ${city.name}`)

        return latest
    } catch (error) {
        if (stored) return stored

        throw error
    }
}

// A partial run (a source failed) stands only for a short cooldown, not for the whole 6-hour issue.
export const isFreshSnapshot = (snapshot: StoredSnapshotMeta, now: Date) =>
    isCurrentIssue(snapshot.issueTime, now) &&
    (snapshot.runStatus === 'OK' || now.getTime() - new Date(snapshot.fetchedAt).getTime() < PARTIAL_RETRY_MS)

export const requireCity = async (slug: string) => {
    const city = await getCityBySlug(slug)

    if (!city) throw new HttpError(404, 'city_not_found', `No city with slug "${slug}"`)

    return city
}

// Adds a geocoded place to the stored cities, named in every locale, so its slug can be opened. `onCreate` runs
// before the geocoder is asked for a city not stored yet (rate limit and quota).
export const trackCity = async (geocodeId: number, onCreate: () => Promise<void> = async () => {}) => {
    const existing = await getCityById(geocodeId)

    if (existing) return existing

    await onCreate()
    const places = await Promise.all(LOCALES.map((locale) => getPlace(geocodeId, locale)))
    const place = places[LOCALES.indexOf(Locale.En)]

    if (!place) throw new HttpError(404, 'place_not_found', `Geocoding id ${geocodeId} not found`)

    return addCity(toCity(place, getLocalNames(places)))
}

// A city whose newest snapshot predates the current 6-hour run is fetched again: there is no scheduled collection,
// so views never wait more than one upstream round trip. Each Lambda instance serves one request at a time, so the
// parallel requests of one page meet in a shared claim: the first fetches and spends the client's quota, the others
// wait for its snapshot. With no quota left the stored snapshot is served as it is.
export const ensureFreshSnapshot = (city: City, client?: string): Promise<SnapshotMeta> =>
    dedupe(`refresh:${city.id}`, async () => {
        const now = new Date()
        const stored = await getLatestSnapshotMeta(city.id)

        if (stored && isFreshSnapshot(stored, now)) return stored

        const isClaimed = await claim(`refresh:${city.id}:${floorToStep(now).getTime()}`, REFRESH_CLAIM_SECONDS)

        if (!isClaimed) return waitForRefresh(city, stored)

        if (client) {
            const hasQuota = await trySpendQuota(client)

            if (!hasQuota && stored) return stored

            if (!hasQuota) throw quotaExceeded()
        }

        return fetchSnapshot(city, stored)
    })
