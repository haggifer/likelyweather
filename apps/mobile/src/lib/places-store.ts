import { parsePlaces } from '@fa/shared/places'
import { createStoredValue } from './stored-value'

// The same rules and key as the web app's local storage: favorites first, then recent picks.
export const placesStore = createStoredValue('fa.places', parsePlaces)
