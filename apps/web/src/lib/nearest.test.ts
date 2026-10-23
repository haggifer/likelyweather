import { getRoundedPosition } from './nearest'

const stubGeolocation = (geolocation: Partial<Geolocation> | undefined) => vi.stubGlobal('navigator', { geolocation })

describe('getRoundedPosition', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('rounds the position to two decimals before it leaves the page', async () => {
        stubGeolocation({
            getCurrentPosition: (onSuccess) =>
                onSuccess({ coords: { latitude: 49.98081, longitude: 36.25272 } } as GeolocationPosition),
        })

        await expect(getRoundedPosition()).resolves.toEqual({ lat: 49.98, lon: 36.25 })
    })

    it('asks once more when the first request times out, as right after the permission prompt', async () => {
        const getCurrentPosition = vi
            .fn<Geolocation['getCurrentPosition']>()
            .mockImplementationOnce((_onSuccess, onError) =>
                onError?.({ code: 3, message: 'Timeout expired' } as GeolocationPositionError),
            )
            .mockImplementationOnce((onSuccess) =>
                onSuccess({ coords: { latitude: 50.45, longitude: 30.52 } } as GeolocationPosition),
            )
        stubGeolocation({ getCurrentPosition })

        await expect(getRoundedPosition()).resolves.toEqual({ lat: 50.45, lon: 30.52 })
        expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    })

    it('rejects when the second request fails too', async () => {
        stubGeolocation({
            getCurrentPosition: (_onSuccess, onError) =>
                onError?.({ code: 2, message: 'Position unavailable' } as GeolocationPositionError),
        })

        await expect(getRoundedPosition()).rejects.toThrow('Position unavailable')
    })

    it('rejects at once when the browser denies or lacks geolocation', async () => {
        const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((_onSuccess, onError) =>
            onError?.({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError),
        )
        stubGeolocation({ getCurrentPosition })

        await expect(getRoundedPosition()).rejects.toThrow('User denied Geolocation')
        expect(getCurrentPosition).toHaveBeenCalledTimes(1)

        stubGeolocation(undefined)

        await expect(getRoundedPosition()).rejects.toThrow('not supported')
    })
})
