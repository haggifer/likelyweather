import { getPrisma, loadLocalEnv } from '@fa/db/client'
import { City } from '@fa/shared/api'
import { getArchivePayload } from './archive'
import { fetchArchiveHours } from './sources/open-meteo-archive'
import { addCity } from './store'

vi.mock('./sources/open-meteo-archive', () => ({ fetchArchiveHours: vi.fn() }))

loadLocalEnv()

const CITY_ID = 999_000_003
const CITY: City = {
    id: CITY_ID,
    slug: 'archiveville-xx-999000003',
    name: 'Archiveville',
    country: 'Testland',
    countryCode: 'XX',
    lat: 1,
    lon: 2,
    timezone: 'UTC',
}
const NOW = new Date('2026-10-12T12:00:00Z')
const RANGE = { from: '2026-10-09', to: '2026-10-10' }

const toHours = (start: string, count: number, temp: (i: number) => number | null) =>
    Array.from({ length: count }, (_, i) => ({
        time: new Date(new Date(start).getTime() + i * 3_600_000),
        values: {
            temp: temp(i),
            feels: 1,
            wind: 2,
            gusts: 3,
            windDir: 90,
            pressure: 1010,
            precip: 0.1,
            humidity: 70,
            cloud: 40,
        },
    }))

describe.runIf(Boolean(process.env.DATABASE_URL))('archive (database)', () => {
    const prisma = getPrisma()
    const fetchMock = vi.mocked(fetchArchiveHours)

    beforeEach(async () => {
        await prisma.city.deleteMany({ where: { id: CITY_ID } })
        await addCity(CITY)
        fetchMock.mockReset()
    })

    afterAll(async () => {
        await prisma.city.deleteMany({ where: { id: CITY_ID } })
    })

    it('fetches a period once, spending one unit, then serves it from the database for free', async () => {
        const spend = vi.fn().mockResolvedValue(undefined)
        fetchMock.mockResolvedValue(toHours('2026-10-09T00:00:00Z', 48, (i) => i))

        const first = await getArchivePayload(CITY, RANGE, spend, NOW)
        const second = await getArchivePayload(CITY, RANGE, spend, NOW)

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(spend).toHaveBeenCalledTimes(1)
        expect(first.steps).toHaveLength(48)
        expect(second.values.temp[47]).toBe(47)
        expect(second.values.humidity[0]).toBe(70)
    })

    it('stores no hour without a temperature, so it is asked for again', async () => {
        const spend = vi.fn().mockResolvedValue(undefined)
        fetchMock.mockResolvedValue(toHours('2026-10-09T00:00:00Z', 48, (i) => (i < 40 ? i : null)))

        await getArchivePayload(CITY, RANGE, spend, NOW)
        await getArchivePayload(CITY, RANGE, spend, NOW)

        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('rejects a period longer than twelve days or reaching today, before spending anything', async () => {
        const spend = vi.fn()

        await expect(getArchivePayload(CITY, { from: '2026-09-28', to: '2026-10-10' }, spend, NOW)).rejects.toThrow()
        await expect(getArchivePayload(CITY, { from: '2026-10-11', to: '2026-10-12' }, spend, NOW)).rejects.toThrow()
        expect(spend).not.toHaveBeenCalled()
    })

    it('fetches nothing when the quota is used up', async () => {
        const spend = vi.fn().mockRejectedValue(new Error('quota'))

        await expect(getArchivePayload(CITY, RANGE, spend, NOW)).rejects.toThrow('quota')
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
