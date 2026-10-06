import { City } from '@fa/shared/api'
import { findNearestCity } from './cities'
import { HttpError } from './errors'
import { getNearestCity } from './store'

vi.mock('./store', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./store')>()),
    getNearestCity: vi.fn(),
}))

const KHARKIV: City = {
    id: 706483,
    slug: 'kharkiv-ua-706483',
    name: 'Kharkiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 49.98081,
    lon: 36.25272,
    timezone: 'Europe/Kyiv',
}

describe('findNearestCity', () => {
    it('returns the stored city with its distance, however far', async () => {
        vi.mocked(getNearestCity).mockResolvedValue(KHARKIV)

        const nearest = await findNearestCity({ lat: 50.45, lon: 30.52 })

        expect(nearest.city).toBe(KHARKIV)
        expect(nearest.distanceKm).toBeCloseTo(410, -1)
    })

    it('answers 404 only when no city is stored at all', async () => {
        vi.mocked(getNearestCity).mockResolvedValue(undefined)

        await expect(findNearestCity({ lat: 0, lon: 0 })).rejects.toMatchObject<Partial<HttpError>>({
            status: 404,
            code: 'not_found',
        })
    })
})
