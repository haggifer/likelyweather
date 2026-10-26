import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { City } from '@fa/shared/api'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { claim } from './cache'
import { ensureFreshSnapshot, isFreshSnapshot, withLocalNames } from './cities'
import { collect } from './collector'
import { addCity, getCityById, StoredSnapshotMeta } from './store'

loadLocalEnv()

const UPSTREAM = path.resolve(import.meta.dirname, '../../../../packages/fixtures/upstream')
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
const PARTIAL_CITY: City = { ...CITY, id: 999_000_005, slug: 'fixture-partial-xx-999000005', name: 'Fixture Partial' }
const CITY_IDS = [CITY.id, OTHER_CITY.id, PARTIAL_CITY.id]

const MINUTE_MS = 60_000

const respond = () =>
    vi.fn(async (url: string | URL) => new Response(String(url).includes('api.met.no') ? METNO : OPEN_METEO))

const respondWithoutMetno = () =>
    vi.fn(async (url: string | URL) =>
        String(url).includes('api.met.no') ? new Response('unavailable', { status: 404 }) : new Response(OPEN_METEO),
    )

describe('isFreshSnapshot', () => {
    const now = new Date('2026-10-05T11:00:00Z')
    const stored = (runStatus: StoredSnapshotMeta['runStatus'], fetchedAt: string): StoredSnapshotMeta => ({
        cityId: 1,
        issueTime: '2026-10-05T06:00:00.000Z',
        runId: 'run',
        fetchedAt,
        runStatus,
    })

    it('keeps a complete run until it is 3 hours old, when the UI offers Refresh', () => {
        expect(isFreshSnapshot(stored('OK', '2026-10-05T08:01:00Z'), now)).toBe(true)
        expect(isFreshSnapshot(stored('OK', '2026-10-05T08:00:00Z'), now)).toBe(false)
    })

    it('fetches a partial run again after the cooldown', () => {
        expect(isFreshSnapshot(stored('PARTIAL', '2026-10-05T10:50:00Z'), now)).toBe(true)
        expect(isFreshSnapshot(stored('PARTIAL', '2026-10-05T10:40:00Z'), now)).toBe(false)
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('ensureFreshSnapshot (database, recorded upstream)', () => {
    const prisma = getPrisma()

    beforeAll(async () => {
        await Promise.all([CITY, OTHER_CITY, PARTIAL_CITY].map((city) => addCity(city)))
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
        await prisma.city.deleteMany({ where: { id: { in: CITY_IDS } } })
        await prisma.collectionRun.deleteMany({
            where: { id: { startsWith: 'preview-99900000' }, cityId: { in: CITY_IDS } },
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
        await claim(`refresh:${OTHER_CITY.id}`, 30)

        const waiting = ensureFreshSnapshot(OTHER_CITY)
        const { run } = await collect({ city: OTHER_CITY })
        const served = await waiting

        expect(served.runId).toBe(run.id)
        expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('retries a partial run once, then serves it for 3 hours', async () => {
        const fetch = respondWithoutMetno()
        vi.stubGlobal('fetch', fetch)

        const first = await ensureFreshSnapshot(PARTIAL_CITY)
        vi.setSystemTime(NOW.getTime() + 16 * MINUTE_MS)
        await ensureFreshSnapshot(PARTIAL_CITY)
        vi.setSystemTime(NOW.getTime() + 32 * MINUTE_MS)
        await ensureFreshSnapshot(PARTIAL_CITY)
        const callsWhileHeld = fetch.mock.calls.length
        vi.setSystemTime(NOW.getTime() + (16 + 3 * 60 + 1) * MINUTE_MS)
        await ensureFreshSnapshot(PARTIAL_CITY)

        expect(first.runStatus).toBe('PARTIAL')
        expect(callsWhileHeld).toBe(4)
        expect(fetch).toHaveBeenCalledTimes(6)
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('withLocalNames (database, stubbed geocoder)', () => {
    const prisma = getPrisma()
    const OLD_CITY: City = { ...CITY, id: 999_000_006, slug: 'fixture-names-xx-999000006', nameLocal: { uk: 'Стара' } }
    const FAILING_CITY: City = { ...CITY, id: 999_000_007, slug: 'fixture-names-xx-999000007' }

    const respondInLanguage = () =>
        vi.fn(async (url: string | URL) => {
            const language = new URL(url).searchParams.get('language')

            return Response.json({
                id: OLD_CITY.id,
                name: `Name ${language}`,
                admin1: `Region ${language}`,
                country_code: 'XX',
                timezone: 'America/New_York',
                latitude: OLD_CITY.lat,
                longitude: OLD_CITY.lon,
            })
        })

    beforeAll(async () => {
        await Promise.all([OLD_CITY, FAILING_CITY].map((city) => addCity(city)))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: { in: [OLD_CITY.id, FAILING_CITY.id] } } })
    })

    it('fills in the names and regions of every UI language once, keeping English as the record itself', async () => {
        const fetch = respondInLanguage()
        vi.stubGlobal('fetch', fetch)

        const completed = await withLocalNames(OLD_CITY)
        const again = await withLocalNames(completed)

        expect(completed.nameLocal).toMatchObject({ uk: 'Name uk', ru: 'Name ru', de: 'Name de' })
        expect(completed.nameLocal).not.toHaveProperty('en')
        expect(completed.admin1Local).toMatchObject({ uk: 'Region uk', ru: 'Region ru', fr: 'Region fr' })
        expect(again).toBe(completed)
        expect(await getCityById(OLD_CITY.id)).toEqual(completed)
        expect(fetch).toHaveBeenCalledTimes(6)
    })

    it('keeps the stored names when the geocoder fails, to try again on the next read', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('unavailable', { status: 400 })),
        )

        const served = await withLocalNames(FAILING_CITY)

        expect(served).toBe(FAILING_CITY)
        expect((await getCityById(FAILING_CITY.id))?.admin1Local).toBeUndefined()
    })
})
