import { ensureFreshSnapshot, requireCity, trackCity } from '@fa/server/cities'
import { getLatestPayload } from '@fa/server/latest'
import { getQuota, quotaExceeded, trySpendQuota } from '@fa/server/quota'
import { searchPlaces } from '@fa/server/sources/geocoding'
import { countCities, getCities } from '@fa/server/store'
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
import { Variable } from '@fa/shared/variables'
import { Router } from 'express'
import { getClientIp, getParam, parseBody, parseQuery, rateLimit, sendJson } from './http'

const requireQuota = async (client: string) => {
    const hasQuota = await trySpendQuota(client)

    if (!hasQuota) throw quotaExceeded()
}

const getCompareItem = async (slug: string, variable: Variable, client: string) => {
    const city = await requireCity(slug)
    const meta = await ensureFreshSnapshot(city, client).catch(() => null)

    if (!meta) return { city, latest: null }

    const latest = await getLatestPayload(meta, variable)

    return { city, latest }
}

export const apiRouter = Router()

apiRouter.get('/health', rateLimit('read'), async (_req, res) => {
    const cities = await countCities()

    sendJson(res, { ok: true, cities } satisfies HealthResponse, { isCacheable: false })
})

apiRouter.get('/geocode', rateLimit('geocode'), async (req, res) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const client = getClientIp(req)

    const results = await searchPlaces(q, locale ?? DEFAULT_LOCALE, () => requireQuota(client))

    sendJson(res, { results } satisfies GeocodeResponse)
})

// The forecast is fetched by the first /latest request that follows (the page asks for it right away), not in the
// background: a Lambda function is frozen as soon as its response is sent.
apiRouter.post('/cities/track', rateLimit('track'), async (req, res) => {
    const { geocodeId } = parseBody(req, TrackBodySchema)

    const city = await trackCity(geocodeId)

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
    const meta = await ensureFreshSnapshot(city, getClientIp(req))
    const payload = await getLatestPayload(meta, variable)

    sendJson(res, payload)
})

apiRouter.get('/quota', rateLimit('read'), async (req, res) => {
    const quota = await getQuota(getClientIp(req))

    sendJson(res, quota, { isCacheable: false })
})

apiRouter.get('/models', rateLimit('read'), (_req, res) => {
    sendJson(res, MODELS)
})

apiRouter.get('/compare', rateLimit('read'), async (req, res) => {
    const { cities, variable } = parseQuery(req, CompareQuerySchema)
    const client = getClientIp(req)

    const items = await Promise.all(cities.map((slug) => getCompareItem(slug, variable, client)))

    sendJson(res, { items } satisfies CompareResponse)
})
