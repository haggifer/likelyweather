import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location'
import { getRoundedPosition, PositionError } from './position'

jest.mock('expo-location', () => ({
    Accuracy: { Low: 2 },
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
}))

describe('getRoundedPosition', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never)
    })

    afterEach(() => jest.useRealTimers())

    it('gives up after ten seconds without a fix, like the web', async () => {
        jest.mocked(getCurrentPositionAsync).mockReturnValue(new Promise(() => undefined))

        const position = getRoundedPosition()
        const assertion = expect(position).rejects.toBeInstanceOf(PositionError)

        await jest.advanceTimersByTimeAsync(10_000)
        await assertion
    })

    it('asks for low accuracy and rounds the fix', async () => {
        jest.mocked(getCurrentPositionAsync).mockResolvedValue({
            coords: { latitude: 50.0123, longitude: 36.2345 },
        } as never)

        const position = await getRoundedPosition()

        expect(getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 2 })
        expect(position.lat).toBeCloseTo(50.01, 2)
    })

    it('treats a refused permission as no position', async () => {
        jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as never)

        await expect(getRoundedPosition()).rejects.toBeInstanceOf(PositionError)
    })
})
