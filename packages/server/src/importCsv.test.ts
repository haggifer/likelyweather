import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { SEED_CITIES } from '@fa/db/seed-data'
import { City, CityStatus } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { importForecastCsv, parseForecastCsv } from './importCsv'

loadLocalEnv()

const CSV_DIR = path.resolve(import.meta.dirname, '../../fixtures/csv')
const CURRENT = 'forecast_20260910T060626Z.csv'
const LEGACY = 'forecast_20260909T130553Z.csv'
const readCsv = (name: string) => readFileSync(path.join(CSV_DIR, name), 'utf8')
const cities: City[] = SEED_CITIES.map((c) => ({
    ...c,
    status: CityStatus.Active,
    availableModels: [],
    firstTrackedAt: c.firstTrackedAt.toISOString(),
    lastViewedAt: c.lastViewedAt.toISOString(),
    viewCount: 0,
    runsCollected: 0,
}))
const KHARKIV = 706483
const KYIV = 703448

describe('parseForecastCsv', () => {
    it('reads the current header, matches cities by coordinates and skips unknown models and places', () => {
        const parsed = parseForecastCsv(readCsv(CURRENT), CURRENT, cities)
        const kharkiv = parsed.snapshots.find((s) => s.cityId === KHARKIV)!

        expect(parsed.issueTime).toBe('2026-09-10T06:00Z')
        expect(parsed.snapshots.map((s) => s.cityId).sort()).toEqual([KYIV, KHARKIV].sort())
        expect(Object.keys(kharkiv.models).sort()).toEqual([ModelId.EcmwfIfs, ModelId.Gfs, ModelId.Metno].sort())
        expect(kharkiv.steps).toEqual(['2026-09-10T12:00Z', '2026-09-10T18:00Z', '2026-09-11T00:00Z'])
        expect(kharkiv.models[ModelId.Gfs]?.precip).toEqual([0, 0.4, 0])
        expect(kharkiv.models[ModelId.Metno]?.precip).toEqual([null, null, null])
        expect(parsed.skipped).toEqual(['unknown model retired_model', 'no tracked city at 0,0'])
    })

    it('reads the first header version, taking the issue time from the file name', () => {
        const parsed = parseForecastCsv(readCsv(LEGACY), LEGACY, cities)

        expect(parsed.issueTime).toBe('2026-09-09T12:00Z')
        expect(parsed.snapshots[0].models[ModelId.EcmwfIfs]?.wind).toEqual([1.75, 1.1])
        expect(parsed.snapshots[0].models[ModelId.EcmwfIfs]?.precip).toEqual([null, null])
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('importForecastCsv (database)', () => {
    const prisma = getPrisma()

    afterAll(() =>
        prisma.collectionRun.deleteMany({ where: { origin: 'IMPORT', id: { startsWith: 'import-202609' } } }),
    )

    it('stores the expected rows per city and model as an IMPORT run', async () => {
        const run = await importForecastCsv(parseForecastCsv(readCsv(CURRENT), CURRENT, cities), CURRENT)
        const counts = await prisma.forecast.groupBy({
            by: ['cityId', 'modelId'],
            where: { issueTime: new Date('2026-09-10T06:00Z') },
            _count: true,
        })

        expect(run).toMatchObject({ id: 'import-20260910T0600Z', origin: 'IMPORT', rows: 12, citiesCount: 2 })
        expect(counts.map((c) => `${c.cityId}:${c.modelId}:${c._count}`).sort()).toEqual(
            [
                `${KHARKIV}:${ModelId.EcmwfIfs}:3`,
                `${KHARKIV}:${ModelId.Gfs}:3`,
                `${KHARKIV}:${ModelId.Metno}:3`,
                `${KYIV}:${ModelId.EcmwfIfs}:3`,
            ].sort(),
        )
    })
})
