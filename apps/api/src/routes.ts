import { ensureFreshSnapshot, findNearestCity, getStarterCities, requireCity, trackCity } from '@fa/server/cities'
import { getErrorMessage, HttpError } from '@fa/server/errors'
import { getLatestPayload } from '@fa/server/latest'
import { getQuota, quotaExceeded, trySpendQuota } from '@fa/server/quota'
import { searchPlaces } from '@fa/server/sources/geocoding'
import { countCities } from '@fa/server/store'
import {
    CompareQuerySchema,
    CompareResponse,
    DEFAULT_LOCALE,
    GeocodeQuerySchema,
    GeocodeResponse,
    HealthResponse,
    LatestQuerySchema,
    NearestQuerySchema,
    NearestResponse,
    StartersResponse,
    TrackBodySchema,
    TrackResponse,
} from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { Router } from 'express'
import {
    enforceRateLimit,
    getClientKey,
    getParam,
    getViewerCountry,
    parseBody,
    parseQuery,
    rateLimit,
    sendJson,
} from './http'
import { getLatestMaxAge } from './latest-cache'

type CompareItem = CompareResponse['items'][number]

// Upstream failures (Open-Meteo down, a timeout) reach the client as a short 502; the detail stays in the logs.
const toUpstreamError = (message: string) => (error: unknown) => {
    if (error instanceof HttpError) throw error

    console.warn(`${message}: ${getErrorMessage(error)}`)
    throw new HttpError(502, 'upstream_error', message)
}

const requireQuota = async (client: string) => {
    const hasQuota = await trySpendQuota(client)

    if (!hasQuota) throw quotaExceeded()
}

const findCity = (slug: string) =>
    requireCity(slug).catch((error) => {
        if (error instanceof HttpError && error.status === 404) return null

        throw error
    })

const getCompareMeta = (city: CompareItem['city'], client: string) =>
    ensureFreshSnapshot(city, client).catch((error) => {
        console.warn(`Compare could not refresh ${city.slug}: ${getErrorMessage(error)}`)

        return null
    })

// An unknown slug is left out rather than failing the other cities; the client shows it as not found.
const getCompareItem = async (slug: string, variable: Variable, client: string) => {
    const city = await findCity(slug)

    if (!city) return null

    const meta = await getCompareMeta(city, client)

    if (!meta) return { item: { city, latest: null }, maxAge: null }

    const latest = await getLatestPayload(meta, variable)

    return { item: { city, latest }, maxAge: getLatestMaxAge(meta.fetchedAt, new Date()) }
}

// Shared only when every requested city was found and every run can still be shared, for the shortest of their times.
const toCompareResponse = (results: Awaited<ReturnType<typeof getCompareItem>>[]) => {
    const found = results.filter((r) => r !== null)
    const items: CompareItem[] = found.map((r) => r.item)
    const ages = found.map((r) => r.maxAge)
    const isShared = found.length === results.length && ages.every((age) => age !== null)

    return { items, maxAge: isShared ? Math.min(...(ages as number[])) : null }
}

export const apiRouter = Router()

apiRouter.get('/health', rateLimit('read'), async (_req, res) => {
    const cities = await countCities()

    sendJson(res, { ok: true, cities } satisfies HealthResponse, { maxAge: null })
})

apiRouter.get('/geocode', rateLimit('geocode'), async (req, res) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const client = getClientKey(req)

    const results = await searchPlaces(q, locale ?? DEFAULT_LOCALE, () => requireQuota(client)).catch(
        toUpstreamError('Place search is unavailable'),
    )

    sendJson(res, { results } satisfies GeocodeResponse)
})

// The forecast is fetched by the first /latest request that follows (the page asks for it right away), not in the
// background: a Lambda function is frozen as soon as its response is sent.
// Picking a stored city is free; only adding a new one asks the geocoder, so only that counts against the hourly
// limit. It spends no quota: the forecast fetch that follows does, so a pick costs the viewer one request at most.
apiRouter.post('/cities/track', rateLimit('read'), async (req, res) => {
    const { geocodeId } = parseBody(req, TrackBodySchema)
    const client = getClientKey(req)

    const city = await trackCity(geocodeId, () => enforceRateLimit('track', client)).catch(
        toUpstreamError('The place could not be looked up'),
    )

    sendJson(res, { slug: city.slug } satisfies TrackResponse, { maxAge: null })
})

// The viewer's country picks the first visit's chips; the answer depends on the caller, so CloudFront must not share it.
apiRouter.get('/starters', rateLimit('read'), async (req, res) => {
    const items = await getStarterCities(getViewerCountry(req))

    sendJson(res, { items } satisfies StartersResponse, { maxAge: null })
})

// Clients round the coordinates to two decimals first, so CloudFront can share the answer; nothing is stored, no
// quota is spent, and the API never logs query strings.
apiRouter.get('/cities/nearest', rateLimit('read'), async (req, res) => {
    const coordinates = parseQuery(req, NearestQuerySchema)
    const nearest = await findNearestCity(coordinates)

    sendJson(res, nearest satisfies NearestResponse)
})

apiRouter.get('/cities/:slug', rateLimit('read'), async (req, res) => {
    const city = await requireCity(getParam(req, 'slug'))

    sendJson(res, city)
})

apiRouter.get('/cities/:slug/latest', rateLimit('read'), async (req, res) => {
    const { variable } = parseQuery(req, LatestQuerySchema)

    const city = await requireCity(getParam(req, 'slug'))
    const meta = await ensureFreshSnapshot(city, getClientKey(req))
    const payload = await getLatestPayload(meta, variable)

    sendJson(res, payload, { maxAge: getLatestMaxAge(meta.fetchedAt, new Date()) })
})

apiRouter.get('/quota', rateLimit('read'), async (req, res) => {
    const quota = await getQuota(getClientKey(req))

    sendJson(res, quota, { maxAge: null })
})

apiRouter.get('/models', rateLimit('read'), (_req, res) => {
    sendJson(res, MODELS)
})

apiRouter.get('/compare', rateLimit('read'), async (req, res) => {
    const { cities, variable } = parseQuery(req, CompareQuerySchema)
    const client = getClientKey(req)

    const results = await Promise.all(cities.map((slug) => getCompareItem(slug, variable, client)))
    const { items, maxAge } = toCompareResponse(results)

    sendJson(res, { items } satisfies CompareResponse, { maxAge })
})
