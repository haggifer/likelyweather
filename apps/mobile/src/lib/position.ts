import { Coordinates, roundCoordinates } from '@fa/shared/geo'
import {
    Accuracy,
    getCurrentPositionAsync,
    requestForegroundPermissionsAsync,
    reverseGeocodeAsync,
} from 'expo-location'

// Thrown when the device could not say where the viewer is: no permission, location off, no fix, or no fix in time.
export class PositionError extends Error {}

// The web's limit: a fix that takes longer is treated like no fix, so the button never spins on.
const POSITION_TIMEOUT_MS = 10_000

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new PositionError(`No position within ${ms} ms`)), ms)

        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (error: unknown) => {
                clearTimeout(timer)
                reject(error)
            },
        )
    })

// Foreground only and at low accuracy, which a city needs and the network gives quickly; the position is rounded to
// about a kilometre before anything uses it.
export const getRoundedPosition = async (): Promise<Coordinates> => {
    const { status } = await requestForegroundPermissionsAsync()

    if (status !== 'granted') throw new PositionError('Location permission was not granted')

    try {
        const { coords } = await withTimeout(getCurrentPositionAsync({ accuracy: Accuracy.Low }), POSITION_TIMEOUT_MS)

        return roundCoordinates({ lat: coords.latitude, lon: coords.longitude })
    } catch (error) {
        throw new PositionError(error instanceof Error ? error.message : String(error))
    }
}

// The platform's geocoder names the place (on phones with Google Play services, Google's network geocoder receives the
// rounded position, as the privacy policy says); the name then goes through the app's search.
export const getPlaceName = async ({ lat, lon }: Coordinates) => {
    try {
        const [address] = await reverseGeocodeAsync({ latitude: lat, longitude: lon })

        return address?.city ?? address?.subregion ?? address?.district ?? null
    } catch {
        return null
    }
}
