import { Coordinates, roundCoordinates } from '@fa/shared/geo'
import {
    Accuracy,
    getCurrentPositionAsync,
    requestForegroundPermissionsAsync,
    reverseGeocodeAsync,
} from 'expo-location'

// Thrown when the device could not say where the viewer is: no permission, location off, or no fix.
export class PositionError extends Error {}

// Foreground only and at balanced accuracy; the position is rounded to about a kilometre before anything uses it.
export const getRoundedPosition = async (): Promise<Coordinates> => {
    const { status } = await requestForegroundPermissionsAsync()

    if (status !== 'granted') throw new PositionError('Location permission was not granted')

    try {
        const { coords } = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced })

        return roundCoordinates({ lat: coords.latitude, lon: coords.longitude })
    } catch (error) {
        throw new PositionError(error instanceof Error ? error.message : String(error))
    }
}

// The platform's own geocoder names the place on the device; the name then goes through the app's search.
export const getPlaceName = async ({ lat, lon }: Coordinates) => {
    try {
        const [address] = await reverseGeocodeAsync({ latitude: lat, longitude: lon })

        return address?.city ?? address?.subregion ?? address?.district ?? null
    } catch {
        return null
    }
}
