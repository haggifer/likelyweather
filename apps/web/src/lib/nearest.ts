import { Coordinates, roundCoordinates } from '@fa/shared/geo'

// A position up to five minutes old answers at once; a viewer does not move far between two taps.
const POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
// `GeolocationPositionError.PERMISSION_DENIED`, the one failure a second request cannot change.
const PERMISSION_DENIED = 1

const requestPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, POSITION_OPTIONS),
    )

// Right after the permission prompt a phone's location service may still be starting, so the first request can time
// out or report no position while a second one gets it.
const requestPositionWithRetry = async () => {
    try {
        return await requestPosition()
    } catch (error) {
        if ((error as GeolocationPositionError).code === PERMISSION_DENIED) throw error

        return requestPosition()
    }
}

// Rounded before it leaves the page. A denied permission, a timeout and an unavailable position all reject alike,
// because the page answers them with the same message.
export const getRoundedPosition = async (): Promise<Coordinates> => {
    if (!navigator.geolocation) throw new Error('Geolocation is not supported')

    try {
        const { coords } = await requestPositionWithRetry()

        return roundCoordinates({ lat: coords.latitude, lon: coords.longitude })
    } catch (error) {
        throw new Error((error as GeolocationPositionError).message)
    }
}
