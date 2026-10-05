import {
    ensureFreshSnapshot,
    getPreviewRunId,
    recordView,
    requireCity,
    toCityDetail,
    trackCity,
} from '@fa/server/cities'
import { getLatestPayload } from '@fa/server/latest'
import { getQuota, quotaExceeded, trySpendQuota } from '@fa/server/quota'
import { searchPlaces } from '@fa/server/sources/geocoding'
import { getCities, getRuns, Run } from '@fa/server/store'
import {
    CitiesQuerySchema,
    CityStatus,
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

const getLatestIssueTime = (runs: Run[]) =>
    runs
        .filter((r) => r.status !== 'FAILED')
        .map((r) => r.issueTime)
        .sort()
        .at(-1)

const getLagMinutes = (issueTime: string) => Math.round((Date.now() - new Date(issueTime).getTime()) / 60_000)

const requireQuota = async (client: string) => {
    const hasQuota = await trySpendQuota(client)

    if (!hasQuota) throw quotaExceeded()
}

const viewCity = async (slug: string) => {
    const viewed = await recordView(slug)

    if (viewed) return viewed

    return requireCity(slug)
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
    const [cities, runs] = await Promise.all([getCities(), getRuns()])

    const latestIssueTime = getLatestIssueTime(runs)
    const body: HealthResponse = {
        ok: true,
        latestIssueTime: latestIssueTime ?? null,
        lagMinutes: latestIssueTime ? getLagMinutes(latestIssueTime) : null,
        activeCities: cities.filter((c) => c.status === CityStatus.Active).length,
    }

    sendJson(res, body, { isCacheable: false })
})

apiRouter.get('/geocode', rateLimit('geocode'), async (req, res) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const client = getClientIp(req)

    const results = await searchPlaces(q, locale ?? DEFAULT_LOCALE, () => requireQuota(client))

    sendJson(res, { results } satisfies GeocodeResponse)
})

// The preview is fetched by the first /latest request that follows (the page asks for it right away), not in the
// background: a Lambda function is frozen as soon as its response is sent.
apiRouter.post('/cities/track', rateLimit('track'), async (req, res) => {
    const { geocodeId } = parseBody(req, TrackBodySchema)

    const city = await trackCity(geocodeId)
    const body: TrackResponse = { slug: city.slug, status: city.status, previewRunId: getPreviewRunId(city) }

    sendJson(res, body, { isCacheable: false })
})

apiRouter.get('/cities', rateLimit('read'), async (req, res) => {
    const { status } = parseQuery(req, CitiesQuerySchema)

    const cities = await getCities()
    const items = status ? cities.filter((c) => c.status === status) : cities

    sendJson(res, { items }, { isCacheable: false })
})

apiRouter.get('/cities/:slug', rateLimit('read'), async (req, res) => {
    const city = await viewCity(getParam(req, 'slug'))
    const detail = await toCityDetail(city)

    sendJson(res, detail, { isCacheable: false })
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
