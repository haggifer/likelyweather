import { getPlacesSnapshot, getServerPlacesSnapshot, subscribePlaces } from '@/lib/places-store'
import { Places } from '@fa/shared/places'
import { useSyncExternalStore } from 'react'

// The viewer's favorite and recent places, or null until they are read after hydration.
export function usePlaces(): Places | null {
    return useSyncExternalStore(subscribePlaces, getPlacesSnapshot, getServerPlacesSnapshot)
}
