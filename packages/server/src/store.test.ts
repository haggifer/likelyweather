import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { CityStatus } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import {
    getLatestSnapshot,
    getLatestSnapshotMeta,
    getSnapshotGrid,
    updateCities,
    upsertRun,
    writeSnapshot,
} from './store'
import { getWindowSteps } from './window'

loadLocalEnv()

const CITY_ID = 999_000_001
const ISSUE = '2030-03-04T06:00Z'

describe.runIf(Boolean(process.env.DATABASE_URL))('store (database)', () => {
    const prisma = getPrisma()
    const steps = getWindowSteps(new Date(ISSUE))
    const values = (base: number) => steps.map((_, i) => (i % 5 === 0 ? null : base + i))

    beforeAll(async () => {
        await prisma.city.deleteMany({ where: { id: CITY_ID } })
        await updateCities((cities) => [
            ...cities,
            {
                id: CITY_ID,
                slug: 'testville-xx-999000001',
                name: 'Testville',
                country: 'Testland',
                countryCode: 'XX',
                lat: 1,
                lon: 2,
                timezone: 'UTC',
                status: CityStatus.Active,
                availableModels: [],
                firstTrackedAt: '2030-03-01T00:00:00.000Z',
                lastViewedAt: '2030-03-01T00:00:00.000Z',
                viewCount: 0,
                runsCollected: 0,
            },
        ])
        await upsertRun({
            id: 'test-run',
            issueTime: ISSUE,
            origin: 'PREVIEW',
            cityId: CITY_ID,
            startedAt: '2030-03-04T07:00:00.000Z',
            finishedAt: null,
            status: 'OK',
            rows: 0,
            citiesCount: 1,
            warnings: [],
            archivePath: null,
        })
    })

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: CITY_ID } })
        await prisma.collectionRun.deleteMany({ where: { id: 'test-run' } })
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Forecast_p20300304", "Forecast_p20300311"')
    })

    it('writes a snapshot and reads the same grid back, whole or by field and model', async () => {
        const series = {
            temp: values(10),
            wind: values(1),
            windDir: values(90),
            pressure: values(1000),
            pressureSfc: values(990),
            precip: values(0),
            rain: values(0),
            snow: values(0),
        }

        await writeSnapshot({
            cityId: CITY_ID,
            issueTime: ISSUE,
            runId: 'test-run',
            origin: 'PREVIEW',
            fetchedAt: '2030-03-04T07:01:00.000Z',
            metnoLastModified: 'Tue, 04 Mar 2030 06:30:00 GMT',
            steps,
            models: { [ModelId.Gfs]: series, [ModelId.Metno]: { ...series, temp: values(20) } },
        })

        const snapshot = await getLatestSnapshot(CITY_ID)

        expect(snapshot?.issueTime).toBe(new Date(ISSUE).toISOString())
        expect(snapshot?.steps).toEqual(steps)
        expect(snapshot?.models[ModelId.Gfs]).toEqual(series)
        expect(snapshot?.metnoLastModified).toBe('Tue, 04 Mar 2030 06:30:00 GMT')

        const meta = await getLatestSnapshotMeta(CITY_ID)
        const temps = await getSnapshotGrid(meta!, ['temp'], [ModelId.Metno])

        expect(Object.keys(temps.models)).toEqual([ModelId.Metno])
        expect(temps.models[ModelId.Metno]).toEqual({ temp: values(20) })
    })

    it('updates only the cities a mutation changes', async () => {
        const after = await updateCities((cities) =>
            cities.map((c) => (c.id === CITY_ID ? { ...c, viewCount: c.viewCount + 1 } : c)),
        )

        const stored = await prisma.city.findUnique({ where: { id: CITY_ID } })

        expect(after.find((c) => c.id === CITY_ID)?.viewCount).toBe(1)
        expect(stored?.viewCount).toBe(1)
    })
})
