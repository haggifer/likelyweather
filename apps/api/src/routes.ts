import { ensureFreshSnapshot, requireCity, trackCity } from '@fa/server/cities'
import { getErrorMessage, HttpError } from '@fa/server/errors'
import { getLatestPayload } from '@fa/server/latest'
import { getQuota, quotaExceeded, trySpendQuota } from '@fa/server/quota'
import { searchPlaces } from '@fa/server/sources/geocoding'
import { countCities, getCities, SnapshotMeta } from '@fa/server/store'
import {
    CompareQuerySchema,
    CompareResponse,
    DEFAULT_LOCALE,
    GeocodeQuerySchema,
    GeocodeResponse,
    HealthResponse,
    LatestQuerySchema,
    TrackBodySchema,
    TrackResponse,
} from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { isCurrentIssue } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { Router } from 'express'
import { enforceRateLimit, getClientKey, getParam, parseBody, parseQuery, rateLimit, sendJson } from './http'

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

// A stored run served because a refresh was not possible (no quota, upstream down) is right for this caller only, so
// CloudFront must not hand it to everyone for five minutes.
const isCurrent = (meta: SnapshotMeta) => isCurrentIssue(meta.issueTime, new Date())

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

    if (!meta) return { item: { city, latest: null }, isCurrent: false }

    const latest = await getLatestPayload(meta, variable)

    return { item: { city, latest }, isCurrent: isCurrent(meta) }
}

const toCompareResponse = (results: Awaited<ReturnType<typeof getCompareItem>>[]) => {
    const found = results.filter((r) => r !== null)
    const items: CompareItem[] = found.map((r) => r.item)

    return { items, isCacheable: found.length === results.length && found.every((r) => r.isCurrent) }
}

export const apiRouter = Router()

apiRouter.get('/health', rateLimit('read'), async (_req, res) => {
    const cities = await countCities()

    sendJson(res, { ok: true, cities } satisfies HealthResponse, { isCacheable: false })
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
// Picking a stored city is free; only adding a new one asks the geocoder, so only that is limited and spends quota.
apiRouter.post('/cities/track', rateLimit('read'), async (req, res) => {
    const { geocodeId } = parseBody(req, TrackBodySchema)
    const client = getClientKey(req)

    const city = await trackCity(geocodeId, async () => {
        await enforceRateLimit('track', client)
        await requireQuota(client)
    }).catch(toUpstreamError('The place could not be looked up'))

    sendJson(res, { slug: city.slug } satisfies TrackResponse, { isCacheable: false })
})

apiRouter.get('/cities', rateLimit('read'), async (_req, res) => {
    const items = await getCities()

    sendJson(res, { items }, { isCacheable: false })
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

    sendJson(res, payload, { isCacheable: isCurrent(meta) })
})

apiRouter.get('/quota', rateLimit('read'), async (req, res) => {
    const quota = await getQuota(getClientKey(req))

    sendJson(res, quota, { isCacheable: false })
})

apiRouter.get('/models', rateLimit('read'), (_req, res) => {
    sendJson(res, MODELS)
})

apiRouter.get('/compare', rateLimit('read'), async (req, res) => {
    const { cities, variable } = parseQuery(req, CompareQuerySchema)
    const client = getClientKey(req)

    const results = await Promise.all(cities.map((slug) => getCompareItem(slug, variable, client)))
    const { items, isCacheable } = toCompareResponse(results)

    sendJson(res, { items } satisfies CompareResponse, { isCacheable })
})
