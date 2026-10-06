import { formatDistanceKm, getRoundedPosition, isNearEnough } from './nearest'

const stubGeolocation = (geolocation: Partial<Geolocation> | undefined) => vi.stubGlobal('navigator', { geolocation })

describe('isNearEnough', () => {
    it('accepts the nearest city up to 50 km away', () => {
        expect(isNearEnough(0)).toBe(true)
        expect(isNearEnough(50)).toBe(true)
        expect(isNearEnough(50.1)).toBe(false)
    })
})

describe('formatDistanceKm', () => {
    it('rounds to whole kilometres in the locale', () => {
        expect(formatDistanceKm(409.6, 'en')).toBe('410')
        expect(formatDistanceKm(1234.4, 'de')).toBe('1.234')
    })
})

describe('getRoundedPosition', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('rounds the position to two decimals before it leaves the page', async () => {
        stubGeolocation({
            getCurrentPosition: (onSuccess) =>
                onSuccess({ coords: { latitude: 49.98081, longitude: 36.25272 } } as GeolocationPosition),
        })

        await expect(getRoundedPosition()).resolves.toEqual({ lat: 49.98, lon: 36.25 })
    })

    it('rejects when the browser denies or lacks geolocation', async () => {
        stubGeolocation({
            getCurrentPosition: (_onSuccess, onError) =>
                onError?.({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError),
        })

        await expect(getRoundedPosition()).rejects.toThrow('User denied Geolocation')

        stubGeolocation(undefined)

        await expect(getRoundedPosition()).rejects.toThrow('not supported')
    })
})
