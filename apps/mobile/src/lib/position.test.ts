import { getCurrentPositionAsync, getLastKnownPositionAsync, requestForegroundPermissionsAsync } from 'expo-location'
import { getRoundedPosition, PositionError } from './position'

jest.mock('expo-location', () => ({
    Accuracy: { Low: 2 },
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    getLastKnownPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
}))

const KHARKIV = { coords: { latitude: 50.0123, longitude: 36.2345 } } as never

describe('getRoundedPosition', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never)
        jest.mocked(getLastKnownPositionAsync).mockResolvedValue(null)
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.mocked(getCurrentPositionAsync).mockReset()
    })

    it('gives up after two tries of ten seconds without a fix', async () => {
        jest.mocked(getCurrentPositionAsync).mockReturnValue(new Promise(() => undefined))

        const position = getRoundedPosition()
        const assertion = expect(position).rejects.toBeInstanceOf(PositionError)

        await jest.advanceTimersByTimeAsync(20_000)
        await assertion
        expect(getCurrentPositionAsync).toHaveBeenCalledTimes(2)
    })

    it('asks once more when the first try finds no fix, as right after the permission prompt', async () => {
        jest.mocked(getCurrentPositionAsync).mockRejectedValueOnce(new Error('No fix')).mockResolvedValueOnce(KHARKIV)

        const position = await getRoundedPosition()

        expect(position.lat).toBeCloseTo(50.01, 2)
        expect(getCurrentPositionAsync).toHaveBeenCalledTimes(2)
    })

    it('answers with a position up to five minutes old without asking for a new fix', async () => {
        jest.mocked(getLastKnownPositionAsync).mockResolvedValue(KHARKIV)

        const position = await getRoundedPosition()

        expect(getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000 })
        expect(getCurrentPositionAsync).not.toHaveBeenCalled()
        expect(position.lon).toBeCloseTo(36.23, 2)
    })

    it('asks for low accuracy and rounds the fix', async () => {
        jest.mocked(getCurrentPositionAsync).mockResolvedValue(KHARKIV)

        const position = await getRoundedPosition()

        expect(getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 2 })
        expect(position.lat).toBeCloseTo(50.01, 2)
    })

    it('treats a refused permission as no position', async () => {
        jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as never)

        await expect(getRoundedPosition()).rejects.toBeInstanceOf(PositionError)
    })
})
