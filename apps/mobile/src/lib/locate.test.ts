import { apiGet, apiPost } from '@fa/api-client/api'
import { Locale } from '@fa/shared/api'
import { locateCity } from './locate'
import { getPlaceName, getRoundedPosition } from './position'

jest.mock('@fa/api-client/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn() }))
jest.mock('./position', () => ({ getRoundedPosition: jest.fn(), getPlaceName: jest.fn() }))

const ODESSA_TX = { lat: 31.85, lon: -102.37 }
const FAR_CITY = {
    id: 1,
    slug: 'dallas-us-1',
    name: 'Dallas',
    country: 'United States',
    countryCode: 'US',
    lat: 32.78,
    lon: -96.8,
    timezone: 'America/Chicago',
}
const ODESA_UA = {
    id: 698740,
    name: 'Odesa',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 46.48,
    lon: 30.72,
    timezone: 'Europe/Kyiv',
    population: 1_015_826,
}
const ODESSA_US = {
    id: 5530022,
    name: 'Odessa',
    admin1: 'Texas',
    country: 'United States',
    countryCode: 'US',
    lat: 31.85,
    lon: -102.37,
    timezone: 'America/Chicago',
    population: 114_428,
}

const mockApi = (geocode: () => Promise<unknown>) => {
    jest.mocked(apiGet).mockImplementation(async (path: string) => {
        if (path === '/cities/nearest') return { city: FAR_CITY, distanceKm: 540 }
        if (path === '/geocode') return geocode()
        throw new Error(`unexpected ${path}`)
    })
}

describe('locateCity', () => {
    beforeEach(() => {
        jest.mocked(getRoundedPosition).mockResolvedValue(ODESSA_TX)
        jest.mocked(getPlaceName).mockResolvedValue('Odessa')
        jest.mocked(apiPost).mockResolvedValue({ slug: 'odessa-us-5530022' })
    })

    afterEach(() => jest.resetAllMocks())

    it('opens the namesake nearest the device, not the most populous one', async () => {
        mockApi(async () => ({ results: [ODESA_UA, ODESSA_US] }))

        const result = await locateCity(Locale.En)

        expect(apiPost).toHaveBeenCalledWith('/cities/track', { geocodeId: ODESSA_US.id })
        expect(result).toMatchObject({ kind: 'open', place: { slug: 'odessa-us-5530022' } })
    })

    it('offers the nearest stored city when every namesake is far from the device', async () => {
        mockApi(async () => ({ results: [ODESA_UA] }))

        await expect(locateCity(Locale.En)).resolves.toEqual({ kind: 'far', city: FAR_CITY, distanceKm: 540 })
        expect(apiPost).not.toHaveBeenCalled()
    })

    it('keeps the nearest-city answer when the name search fails', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {})
        mockApi(async () => {
            throw new Error('quota_exceeded')
        })

        await expect(locateCity(Locale.En)).resolves.toEqual({ kind: 'far', city: FAR_CITY, distanceKm: 540 })
    })
})
