import { useSyncExternalStore } from 'react'
import { getSelectedCity, subscribeSelectedCity } from '../lib/selected-city-store'

export function useSelectedCity(): string | null {
    return useSyncExternalStore(subscribeSelectedCity, getSelectedCity)
}
