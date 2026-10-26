import { getPlacesSnapshot, getServerPlacesSnapshot, subscribePlaces } from '@/lib/places-store'
import { Places } from '@fa/shared/places'
import { useSyncExternalStore } from 'react'

// Null until the stored places are read after hydration.
export function usePlaces(): Places | null {
    return useSyncExternalStore(subscribePlaces, getPlacesSnapshot, getServerPlacesSnapshot)
}
