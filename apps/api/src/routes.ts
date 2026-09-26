import { getRunArchive } from '@fa/server/archive'
import {
    ensureFreshSnapshot,
    getPreviewRunId,
    recordView,
    requireCity,
    toCityDetail,
    trackCity,
} from '@fa/server/cities'
import { HttpError } from '@fa/server/errors'
import { getLatestPayload } from '@fa/server/latest'
import { getQuota, quotaExceeded, trySpendQuota } from '@fa/server/quota'
import { searchPlaces } from '@fa/server/sources/geocoding'
import { getCities, getRun, getRuns } from '@fa/server/store'
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
    RunsQuerySchema,
    RunsResponse,
    TimelineQuerySchema,
    TimelineResponse,
    TrackBodySchema,
    TrackResponse,
} from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { toIsoMinute } from '@fa/shared/time'
import { Router } from 'express'
import { getClientIp, param, parseBody, parseQuery, rateLimit, sendJson } from './http'

const DAY_MS = 86_400_000

export const apiRouter = Router()

apiRouter.get('/health', rateLimit('read'), async (_req, res) => {
    const [cities, runs] = await Promise.all([getCities(), getRuns()])
    const latestIssueTime = runs
        .filter((r) => r.status !== 'FAILED')
        .map((r) => r.issueTime)
        .sort()
        .at(-1)
    const body: HealthResponse = {
        ok: true,
        latestIssueTime: latestIssueTime ?? null,
        lagMinutes: latestIssueTime ? Math.round((Date.now() - new Date(latestIssueTime).getTime()) / 60_000) : null,
        activeCities: cities.filter((c) => c.status === CityStatus.Active).length,
    }

    sendJson(res, body, { cache: false })
})

apiRouter.get('/geocode', rateLimit('geocode'), async (req, res) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const client = getClientIp(req)
    const results = await searchPlaces(q, locale ?? DEFAULT_LOCALE, async () => {
        if (!(await trySpendQuota(client))) throw quotaExceeded()
    })

    sendJson(res, { results } satisfies GeocodeResponse)
})

// The preview is fetched by the first /latest request that follows (the page asks for it right away), not in the
// background: a Lambda function is frozen as soon as its response is sent.
apiRouter.post('/cities/track', rateLimit('track'), async (req, res) => {
    const { geocodeId } = parseBody(req, TrackBodySchema)
    const city = await trackCity(geocodeId)
    const body: TrackResponse = { slug: city.slug, status: city.status, previewRunId: getPreviewRunId(city) }

    sendJson(res, body, { cache: false })
})

apiRouter.get('/cities', rateLimit('read'), async (req, res) => {
    const { status } = parseQuery(req, CitiesQuerySchema)
    const cities = await getCities()

    sendJson(res, { items: status ? cities.filter((c) => c.status === status) : cities }, { cache: false })
})

apiRouter.get('/cities/:slug', rateLimit('read'), async (req, res) => {
    const city = (await recordView(param(req, 'slug'))) ?? (await requireCity(param(req, 'slug')))

    sendJson(res, await toCityDetail(city), { cache: false })
})

apiRouter.get('/cities/:slug/latest', rateLimit('read'), async (req, res) => {
    const { variable } = parseQuery(req, LatestQuerySchema)
    const meta = await ensureFreshSnapshot(await requireCity(param(req, 'slug')), getClientIp(req))

    sendJson(res, await getLatestPayload(meta, variable))
})

apiRouter.get('/quota', rateLimit('read'), async (req, res) => {
    sendJson(res, await getQuota(getClientIp(req)), { cache: false })
})

apiRouter.get('/models', rateLimit('read'), (_req, res) => {
    sendJson(res, MODELS)
})

apiRouter.get('/compare', rateLimit('read'), async (req, res) => {
    const { cities, variable } = parseQuery(req, CompareQuerySchema)
    const client = getClientIp(req)
    const items = await Promise.all(
        cities.map(async (slug) => {
            const city = await requireCity(slug)
            const meta = await ensureFreshSnapshot(city, client).catch(() => null)

            return { city, latest: meta ? await getLatestPayload(meta, variable) : null }
        }),
    )

    sendJson(res, { items } satisfies CompareResponse)
})

apiRouter.get('/runs', rateLimit('read'), async (req, res) => {
    const { limit, cursor } = parseQuery(req, RunsQuerySchema)
    const runs = await getRuns()
    const start = cursor ? runs.findIndex((r) => r.id === cursor) + 1 : 0
    const items = runs.slice(start, start + limit)
    const nextCursor = runs[start + limit] ? items.at(-1)?.id : undefined

    sendJson(res, { items, nextCursor } satisfies RunsResponse, { cache: false })
})

apiRouter.get('/runs/timeline', rateLimit('read'), async (req, res) => {
    const { days } = parseQuery(req, TimelineQuerySchema)
    const to = new Date()
    const from = new Date(to.getTime() - days * DAY_MS)
    const runs = (await getRuns())
        .filter((r) => new Date(r.issueTime) >= from)
        .map(({ id, issueTime, status, origin }) => ({ id, issueTime, status, origin }))

    sendJson(res, { from: toIsoMinute(from), to: toIsoMinute(to), runs } satisfies TimelineResponse, { cache: false })
})

// On AWS a redirect to a presigned S3 URL valid for 10 minutes; locally the stored document itself.
apiRouter.get('/runs/:id/archive', rateLimit('read'), async (req, res) => {
    const run = await getRun(param(req, 'id'))
    const archive = run && (await getRunArchive(run.id))

    if (!archive) throw new HttpError(404, 'run_not_found', `No archive for run "${param(req, 'id')}"`)

    if ('url' in archive) return res.redirect(302, archive.url)

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `inline; filename="${run.id}.json"`,
        'Cache-Control': 'public, max-age=300',
    }).send(archive.body)
})
