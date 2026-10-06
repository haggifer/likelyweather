import { Coordinates, roundCoordinates } from '@fa/shared/geo'

const POSITION_TIMEOUT_MS = 10_000

// The browser's position, rounded before it leaves the page: a denied permission, a timeout and an unavailable
// position all reject alike, because the page answers them with the same message.
export const getRoundedPosition = () =>
    new Promise<Coordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve(roundCoordinates({ lat: coords.latitude, lon: coords.longitude })),
            (error) => reject(new Error(error.message)),
            { enableHighAccuracy: false, timeout: POSITION_TIMEOUT_MS },
        )
    })
