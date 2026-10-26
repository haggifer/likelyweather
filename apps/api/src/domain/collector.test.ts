import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { City } from '@fa/shared/api'
import { FORECAST_HOURS, HOUR_MS, PAST_HOURS } from '@fa/shared/constants'
import { ModelId } from '@fa/shared/models'
import { ModelSeries } from '@fa/shared/variables'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { collect, countRows } from './collector'
import { addCity, getLatestSnapshot, getLatestSnapshotMeta } from './store'

loadLocalEnv()

const UPSTREAM = path.resolve(import.meta.dirname, '../../../../packages/fixtures/upstream')
const OPEN_METEO = readFileSync(path.join(UPSTREAM, 'open-meteo-new-york-20260924T1200Z.json'), 'utf8')
const METNO = readFileSync(path.join(UPSTREAM, 'metno-new-york-20260924T1200Z.json'), 'utf8')
const NOW = new Date('2026-09-24T13:30:00Z')

// A test-only city at New York's coordinates, so the recorded responses fit.
const CITY: City = {
    id: 999_000_002,
    slug: 'fixture-new-york-xx-999000002',
    name: 'Fixture New York',
    country: 'Testland',
    countryCode: 'XX',
    lat: 40.71427,
    lon: -74.00597,
    timezone: 'America/New_York',
}

const respond = (metnoStatus: number, openMeteoStatus = 200) =>
    vi.fn(async (url: string | URL) =>
        String(url).includes('api.met.no')
            ? new Response(metnoStatus === 200 ? METNO : 'unavailable', { status: metnoStatus })
            : new Response(openMeteoStatus === 200 ? OPEN_METEO : 'bad request', { status: openMeteoStatus }),
    )

describe('countRows', () => {
    it('counts the steps with a temperature across every model', () => {
        const series = (temp: (number | null)[]) => ({ temp }) as unknown as ModelSeries

        const rows = countRows({
            models: { [ModelId.Gfs]: series([1, null, 3]), [ModelId.Metno]: series([null, null, 4]) },
        })

        expect(rows).toBe(3)
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('collect (database, recorded upstream)', () => {
    const prisma = getPrisma()

    beforeAll(async () => {
        await addCity(CITY)
    })

    afterEach(() => vi.unstubAllGlobals())

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: CITY.id } })
        await prisma.collectionRun.deleteMany({ where: { id: { startsWith: `preview-${CITY.id}-` } } })
    })

    it('stores every model on the hourly grid when all sources answer', async () => {
        vi.stubGlobal('fetch', respond(200))

        const { run } = await collect({ city: CITY, now: NOW })
        const snapshot = await getLatestSnapshot(CITY.id)

        expect(run).toMatchObject({ id: `preview-${CITY.id}-20260924T1200Z`, status: 'OK', citiesCount: 1 })
        expect(run.rows).toBeGreaterThan(500)
        expect(snapshot?.steps).toHaveLength(PAST_HOURS + FORECAST_HOURS + 1)
        expect(Object.keys(snapshot!.models)).toContain(ModelId.Metno)
    })

    it('marks the run PARTIAL, not FAILED, when met.no is down', async () => {
        vi.stubGlobal('fetch', respond(503))

        const { run } = await collect({ city: CITY, now: NOW })

        expect(run.status).toBe('PARTIAL')
        expect(run.rows).toBeGreaterThan(500)
        expect(run.warnings.join(' ')).toMatch(/met\.no failed/)
    }, 30_000)

    it('keeps the met.no forecast and warns when Open-Meteo fails', async () => {
        vi.stubGlobal('fetch', respond(200, 400))

        const { run, snapshot } = await collect({ city: CITY, now: NOW })

        expect(run.status).toBe('PARTIAL')
        expect(Object.keys(snapshot!.models)).toEqual([ModelId.Metno])
        expect(run.warnings.join(' ')).toMatch(/Open-Meteo failed/)
    })

    it('leaves a served run alone when a refetch in the same step gets no data', async () => {
        vi.stubGlobal('fetch', respond(200))
        const { run: served } = await collect({ city: CITY, now: NOW })

        vi.stubGlobal('fetch', respond(404, 400))
        const { run: failed, snapshot } = await collect({ city: CITY, now: NOW })
        const stored = await prisma.collectionRun.findUniqueOrThrow({ where: { id: served.id } })

        expect(snapshot).toBeNull()
        expect(failed).toMatchObject({ id: served.id, status: 'FAILED' })
        expect(stored.status).toBe('OK')
        expect(await getLatestSnapshotMeta(CITY.id)).toMatchObject({ runId: served.id, runStatus: 'OK' })
    })

    it('keeps the stored run when Open-Meteo fails at a new issue', async () => {
        vi.stubGlobal('fetch', respond(200))
        const { run: served } = await collect({ city: CITY, now: NOW })

        vi.stubGlobal('fetch', respond(200, 400))
        const { run, snapshot } = await collect({ city: CITY, now: new Date(NOW.getTime() + 6 * HOUR_MS) })

        expect(snapshot).toBeNull()
        expect(run.status).toBe('FAILED')
        expect(await getLatestSnapshotMeta(CITY.id)).toMatchObject({ runId: served.id, runStatus: 'OK' })
    })
})
