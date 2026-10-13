import { useGeocode } from '@fa/api-client/hooks/useGeocode'
import { useTrackCity } from '@fa/api-client/hooks/useTrackCity'
import { GeocodeResponse, GeocodeResult, Locale } from '@fa/shared/api'
import {
    getSearchStatus,
    getSearchTerm,
    isListShown,
    isPlacesView,
    rankResults,
    SearchStatus,
} from '@fa/shared/city-search'
import { SEARCH_DEBOUNCE_MS } from '@fa/shared/constants'
import { Place, Places, toPlace } from '@fa/shared/places'
import { useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

interface UseCitySearchOptions {
    // The current city's name in a switcher: it searches nothing until it is edited.
    initialQuery: string
    locale: Locale
    // Null until the viewer's places are read.
    places: Places | null
    isInitiallyOpen?: boolean
}

interface PickHandlers {
    onPicked: (place: Place) => void
    onError: (error: Error) => void
}

export interface UseCitySearchResult {
    query: string
    setQuery: (query: string) => void
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    results: GeocodeResult[]
    status: SearchStatus | null
    error: Error | null
    isPlacesView: boolean
    isListShown: boolean
    isTracking: boolean
    // Stores the result as a city (tracking it), then hands it over as a place.
    pickResult: (result: GeocodeResult, handlers: PickHandlers) => void
}

// The search box of both apps without its drawing: the text, the debounced geocoder query, the ranked results, which
// list shows, and the pick that tracks a result.
export function useCitySearch({
    initialQuery,
    locale,
    places,
    isInitiallyOpen = false,
}: UseCitySearchOptions): UseCitySearchResult {
    const [query, setQuery] = useState(initialQuery)
    const [isOpen, setIsOpen] = useState(isInitiallyOpen)
    const [lastAnswer, setLastAnswer] = useState<GeocodeResponse | undefined>()

    const term = useDebouncedValue(getSearchTerm(query, initialQuery), SEARCH_DEBOUNCE_MS)
    const { data, isFetching, isError, error, fetchStatus } = useGeocode(term, locale)
    const track = useTrackCity()

    // A failed search keeps the previous answer under its error line.
    if (data && data !== lastAnswer) setLastAnswer(data)

    const answer = data ?? (isError ? lastAnswer : undefined)
    const results = rankResults(answer?.results ?? [], places)
    const listState = { query, initialQuery, hasPlaces: Boolean(places) }
    const status = getSearchStatus({
        query,
        resultCount: results.length,
        isFetching,
        isError,
        isOffline: fetchStatus === 'paused',
    })

    const pickResult = (result: GeocodeResult, { onPicked, onError }: PickHandlers) =>
        track.mutate(result.id, { onSuccess: ({ slug }) => onPicked(toPlace({ ...result, slug })), onError })

    return {
        query,
        setQuery,
        isOpen,
        setIsOpen,
        results,
        status,
        error,
        isPlacesView: isPlacesView(listState),
        isListShown: isListShown({ ...listState, isOpen }),
        isTracking: track.isPending,
        pickResult,
    }
}
