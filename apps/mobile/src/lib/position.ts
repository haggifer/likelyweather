import { Coordinates, roundCoordinates } from '@fa/shared/geo'
import {
    Accuracy,
    getCurrentPositionAsync,
    getLastKnownPositionAsync,
    requestForegroundPermissionsAsync,
    reverseGeocodeAsync,
} from 'expo-location'

// Thrown when the device could not say where the viewer is: no permission, location off, no fix, or no fix in time.
export class PositionError extends Error {}

// The web's limit: a fix that takes longer is treated like no fix, so the button never spins on.
const POSITION_TIMEOUT_MS = 10_000
// The web's `maximumAge`: a position up to five minutes old answers at once.
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000

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

const requestPosition = () => withTimeout(getCurrentPositionAsync({ accuracy: Accuracy.Low }), POSITION_TIMEOUT_MS)

// Right after the permission prompt the location service may still be starting, so the first request can find no fix
// while a second one gets it, as on the web.
const getPosition = async () => {
    const lastKnown = await getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })

    if (lastKnown) return lastKnown

    try {
        return await requestPosition()
    } catch {
        return requestPosition()
    }
}

// Foreground only and at low accuracy, which a city needs and the network gives quickly; the position is rounded to
// about a kilometre before anything uses it.
export const getRoundedPosition = async (): Promise<Coordinates> => {
    const { status } = await requestForegroundPermissionsAsync()

    if (status !== 'granted') throw new PositionError('Location permission was not granted')

    try {
        const { coords } = await getPosition()

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
