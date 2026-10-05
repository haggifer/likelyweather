import { parsePlaces, Places } from '@fa/shared/places'

const STORAGE_KEY = 'fa.places'
const PLACES_EVENT = 'placeschange'

let current: Places | null = null

const readPlaces = () => {
    try {
        return parsePlaces(localStorage.getItem(STORAGE_KEY))
    } catch {
        return parsePlaces(null)
    }
}

// useSyncExternalStore needs the same object back until something changes, so the parsed list is cached.
export const getPlacesSnapshot = (): Places => (current ??= readPlaces())

// The server can't read the viewer's storage: the first render shows placeholders instead of guessing.
export const getServerPlacesSnapshot = (): Places | null => null

export const subscribePlaces = (onChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return

        current = null
        onChange()
    }

    window.addEventListener(PLACES_EVENT, onChange)
    window.addEventListener('storage', handleStorage)

    return () => {
        window.removeEventListener(PLACES_EVENT, onChange)
        window.removeEventListener('storage', handleStorage)
    }
}

export const updatePlaces = (update: (places: Places) => Places) => {
    current = update(getPlacesSnapshot())

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } catch {
        // storage can be blocked; the change still applies until the page is reloaded
    }

    window.dispatchEvent(new Event(PLACES_EVENT))
}
