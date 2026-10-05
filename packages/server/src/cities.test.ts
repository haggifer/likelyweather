import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { City } from '@fa/shared/api'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { claim } from './cache'
import { ensureFreshSnapshot, isFreshSnapshot } from './cities'
import { collect } from './collector'
import { addCity, StoredSnapshotMeta } from './store'

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

const OTHER_CITY: City = { ...CITY, id: 999_000_004, slug: 'fixture-other-xx-999000004', name: 'Fixture Other' }

const respond = () =>
    vi.fn(async (url: string | URL) => new Response(String(url).includes('api.met.no') ? METNO : OPEN_METEO))

describe('isFreshSnapshot', () => {
    const now = new Date('2026-10-05T11:00:00Z')
    const stored = (runStatus: StoredSnapshotMeta['runStatus'], fetchedAt: string): StoredSnapshotMeta => ({
        cityId: 1,
        issueTime: '2026-10-05T06:00:00.000Z',
        runId: 'run',
        fetchedAt,
        runStatus,
    })

    it('keeps a complete run for the whole issue', () => {
        expect(isFreshSnapshot(stored('OK', '2026-10-05T06:10:00Z'), now)).toBe(true)
    })

    it('fetches a partial run again after the cooldown', () => {
        expect(isFreshSnapshot(stored('PARTIAL', '2026-10-05T10:50:00Z'), now)).toBe(true)
        expect(isFreshSnapshot(stored('PARTIAL', '2026-10-05T10:40:00Z'), now)).toBe(false)
    })

    it('fetches a run of an earlier issue', () => {
        expect(isFreshSnapshot({ ...stored('OK', '2026-10-05T05:00:00Z'), issueTime: '2026-10-05T00:00Z' }, now)).toBe(
            false,
        )
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('ensureFreshSnapshot (database, recorded upstream)', () => {
    const prisma = getPrisma()

    beforeAll(async () => {
        await addCity(CITY)
        await addCity(OTHER_CITY)
    })

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true })
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: { in: [CITY.id, OTHER_CITY.id] } } })
        await prisma.collectionRun.deleteMany({
            where: { id: { startsWith: 'preview-99900000' }, cityId: { in: [CITY.id, OTHER_CITY.id] } },
        })
    })

    it('fetches a city once per issue and serves the stored run afterwards', async () => {
        const fetch = respond()
        vi.stubGlobal('fetch', fetch)

        const first = await ensureFreshSnapshot(CITY)
        const second = await ensureFreshSnapshot(CITY)

        expect(second.runId).toBe(first.runId)
        expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('waits for the snapshot of the instance that holds the refresh, without fetching itself', async () => {
        const fetch = respond()
        vi.stubGlobal('fetch', fetch)
        await claim(`refresh:${OTHER_CITY.id}:${new Date('2026-09-24T12:00:00Z').getTime()}`, 30)

        const waiting = ensureFreshSnapshot(OTHER_CITY)
        const { run } = await collect({ city: OTHER_CITY })
        const served = await waiting

        expect(served.runId).toBe(run.id)
        expect(fetch).toHaveBeenCalledTimes(2)
    })
})
