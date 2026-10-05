import { City, GeocodeResult, Locale, LOCALES } from '@fa/shared/api'
import { slugify } from '@fa/shared/seeds'
import { isCurrentIssue } from '@fa/shared/time'
import { dedupe } from './cache'
import { collect } from './collector'
import { getErrorMessage, HttpError } from './errors'
import { quotaExceeded, trySpendQuota } from './quota'
import { pruneExpiredForecasts } from './retention'
import { getPlace } from './sources/geocoding'
import { addCity, getCityById, getCityBySlug, getLatestSnapshotMeta, SnapshotMeta } from './store'

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

export const requireCity = async (slug: string) => {
    const city = await getCityBySlug(slug)

    if (!city) throw new HttpError(404, 'city_not_found', `No tracked city with slug "${slug}"`)

    return city
}

// Adds a geocoded place to the stored cities, named in every locale, so its slug can be opened.
export const trackCity = async (geocodeId: number) => {
    const existing = await getCityById(geocodeId)

    if (existing) return existing

    const places = await Promise.all(LOCALES.map((locale) => getPlace(geocodeId, locale)))
    const place = places[LOCALES.indexOf(Locale.En)]

    if (!place) throw new HttpError(404, 'place_not_found', `Geocoding id ${geocodeId} not found`)

    return addCity(toCity(place, getLocalNames(places)))
}

// A city whose newest snapshot predates the current 6-hour run is fetched again: there is no scheduled collection,
// so views never wait more than one upstream round trip. A fetch on behalf of a `client` spends its daily quota; with
// none left the stored snapshot is served as it is. Concurrent views share one fetch, paid by the first.
export const ensureFreshSnapshot = (city: City, client?: string): Promise<SnapshotMeta> =>
    dedupe(`refresh:${city.id}`, async () => {
        const snapshot = await getLatestSnapshotMeta(city.id)

        if (snapshot && isCurrentIssue(snapshot.issueTime, new Date())) return snapshot

        if (client) {
            const hasQuota = await trySpendQuota(client)

            if (!hasQuota && snapshot) return snapshot

            if (!hasQuota) throw quotaExceeded()
        }

        try {
            const { run, snapshot: fresh } = await collect({ city })
            const latest = fresh ?? snapshot

            await pruneQuietly()

            if (!latest) throw new Error(`No model returned data for ${city.name}: ${run.warnings.join('; ')}`)

            return latest
        } catch (error) {
            if (snapshot) return snapshot

            throw error
        }
    })
