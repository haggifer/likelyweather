import { Places } from '@fa/shared/places'
import { useSyncExternalStore } from 'react'
import { placesStore } from '../lib/places-store'

// Read synchronously from the device, so the chips render at once.
export function usePlaces(): Places {
    return useSyncExternalStore(placesStore.subscribe, placesStore.get)
}
