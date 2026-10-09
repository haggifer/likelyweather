import { City, GeocodeResult, Locale, LOCALES, NearestResponse } from '@fa/shared/api'
import { HOUR_MS, REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { Coordinates, getDistanceKm } from '@fa/shared/geo'
import { slugify } from '@fa/shared/seeds'
import { floorToStep } from '@fa/shared/time'
import { delay } from 'es-toolkit'
import { claim, dedupe, isMarked, mark, releaseClaim } from './cache'
import { collect } from './collector'
import { COUNTRY_STARTERS } from './country-starters'
import { getErrorMessage, HttpError } from './errors'
import { quotaExceeded, trySpendQuota } from './quota'
import { pruneExpiredForecasts } from './retention'
import { getPlace } from './sources/geocoding'
import { addCity, getCityById, getCityBySlug, getLatestSnapshotMeta, getNearestCity, StoredSnapshotMeta } from './store'

const PARTIAL_RETRY_MS = 15 * 60_000
// After a refresh that got nothing, the stored run is served without fetching for as long as a partial run stands.
const FAILED_COOLDOWN_SECONDS = PARTIAL_RETRY_MS / 1000
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

const getCooldownName = (city: City) => `refresh-failed:${city.id}`

const serveStored = (city: City, stored: StoredSnapshotMeta | null) => {
    if (!stored) throw new HttpError(502, 'upstream_error', `No forecast source answered for ${city.name}`)

    return stored
}

// Source failures never throw from `collect`; without any data the stored snapshot is served, or the view fails.
// A failure past that (the database, the partition DDL) also falls back to the stored run, but is logged. Either way
// the stored run stays due, so a cooldown holds further fetches back: otherwise, while the sources are down, every
// view would spend a unit of quota and wait for the timeouts again.
const fetchSnapshot = async (city: City, stored: StoredSnapshotMeta | null): Promise<StoredSnapshotMeta> => {
    try {
        const { run, snapshot } = await collect({ city })

        await pruneQuietly()

        if (snapshot) return { ...snapshot, runStatus: run.status }

        await mark(getCooldownName(city), FAILED_COOLDOWN_SECONDS)

        return serveStored(city, stored)
    } catch (error) {
        if (error instanceof HttpError) throw error

        await mark(getCooldownName(city), FAILED_COOLDOWN_SECONDS)

        if (!stored) throw error

        console.error(`Refresh of ${city.name} failed, serving the stored run: ${getErrorMessage(error)}`)

        return stored
    }
}

// A stored forecast is fetched again once it is 3 hours old, when the UI offers Refresh (`isRefreshDue`); a partial
// run (a source failed), or one whose process died before marking it done, only stands for a short cooldown.
export const getRefreshDueAt = (snapshot: StoredSnapshotMeta) => {
    const lifetimeMs = snapshot.runStatus === 'OK' ? REFRESH_AFTER_HOURS * HOUR_MS : PARTIAL_RETRY_MS

    return new Date(new Date(snapshot.fetchedAt).getTime() + lifetimeMs)
}

export const isFreshSnapshot = (snapshot: StoredSnapshotMeta, now: Date) => now < getRefreshDueAt(snapshot)

export const requireCity = async (slug: string) => {
    const city = await getCityBySlug(slug)

    if (!city) throw new HttpError(404, 'city_not_found', `No city with slug "${slug}"`)

    return city
}

// The nearest stored city, however far: whether it is close enough is the client's call. The distance is computed
// here, from the same function the clients use, so the SQL ordering only has to pick the row.
export const findNearestCity = async (coordinates: Coordinates): Promise<NearestResponse> => {
    const city = await getNearestCity(coordinates)

    if (!city) throw new HttpError(404, 'not_found', 'No city is stored yet')

    return { city, distanceKm: getDistanceKm(coordinates, city) }
}

// Adds a geocoded place to the stored cities, named in every locale, so its slug can be opened. `onCreate` runs
// before the geocoder is asked for a city not stored yet (the hourly limit).
export const trackCity = async (geocodeId: number, onCreate: () => Promise<void> = async () => {}) => {
    const existing = await getCityById(geocodeId)

    if (existing) return existing

    await onCreate()
    const places = await Promise.all(LOCALES.map((locale) => getPlace(geocodeId, locale)))
    const place = places[LOCALES.indexOf(Locale.En)]

    if (!place) throw new HttpError(404, 'place_not_found', `Geocoding id ${geocodeId} not found`)

    return addCity(toCity(place, getLocalNames(places)))
}

// A city whose newest snapshot is due for a refresh is fetched again: there is no scheduled collection, so views
// never wait more than one upstream round trip. Each Lambda instance serves one request at a time, so the
// parallel requests of one page meet in a shared claim: the first fetches and spends the client's quota, the others
// wait for its snapshot. With no quota left the stored snapshot is served as it is, and the claim is given back so
// the next viewer does not wait 12 seconds for a fetch that never starts. After a refresh that got nothing, the
// stored run is served as it is until the cooldown ends.
export const ensureFreshSnapshot = (city: City, client?: string): Promise<StoredSnapshotMeta> =>
    dedupe(`refresh:${city.id}`, async () => {
        const now = new Date()
        const stored = await getLatestSnapshotMeta(city.id)

        if (stored && isFreshSnapshot(stored, now)) return stored

        if (await isMarked(getCooldownName(city))) return serveStored(city, stored)

        const claimName = `refresh:${city.id}:${floorToStep(now).getTime()}`
        const isClaimed = await claim(claimName, REFRESH_CLAIM_SECONDS)

        if (!isClaimed) return waitForRefresh(city, stored)

        if (client) {
            const hasQuota = await trySpendQuota(client)

            if (!hasQuota) {
                await releaseClaim(claimName)

                if (stored) return stored

                throw quotaExceeded()
            }
        }

        return fetchSnapshot(city, stored)
    })

// The "Start with" chips of a first visit: the largest places of the viewer's country, stored on first use like a
// search pick. A place the geocoder no longer knows is left out; the client fills the rest with its defaults.
export const getStarterCities = async (country: string | null) => {
    const ids = country ? (COUNTRY_STARTERS[country] ?? []) : []
    const results = await Promise.allSettled(ids.map((id) => trackCity(id)))

    return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}
