import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { City } from '@fa/shared/api'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ensureFreshSnapshot } from './cities'
import { addCity } from './store'

loadLocalEnv()

const UPSTREAM = path.resolve(import.meta.dirname, '../../fixtures/upstream')
const OPEN_METEO = readFileSync(path.join(UPSTREAM, 'open-meteo-new-york-20260924T1200Z.json'), 'utf8')
const METNO = readFileSync(path.join(UPSTREAM, 'metno-new-york-20260924T1200Z.json'), 'utf8')

// The recordings' run, so the stored grid has data.
const NOW = new Date('2026-09-24T13:30:00Z')

const CITY: City = {
    id: 999_000_003,
    slug: 'fixture-fresh-xx-999000003',
    name: 'Fixture Fresh',
    country: 'Testland',
    countryCode: 'XX',
    lat: 40.71427,
    lon: -74.00597,
    timezone: 'America/New_York',
}

const respond = () =>
    vi.fn(async (url: string | URL) => new Response(String(url).includes('api.met.no') ? METNO : OPEN_METEO))

describe.runIf(Boolean(process.env.DATABASE_URL))('ensureFreshSnapshot (database, recorded upstream)', () => {
    const prisma = getPrisma()

    beforeAll(async () => {
        await addCity(CITY)
    })

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: CITY.id } })
        await prisma.collectionRun.deleteMany({ where: { id: { startsWith: `preview-${CITY.id}-` } } })
    })

    it('fetches a city once per issue and serves the stored run afterwards', async () => {
        const fetch = respond()
        vi.stubGlobal('fetch', fetch)

        const first = await ensureFreshSnapshot(CITY)
        const second = await ensureFreshSnapshot(CITY)

        expect(second.runId).toBe(first.runId)
        expect(fetch).toHaveBeenCalledTimes(2)
    })
})
