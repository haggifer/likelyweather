import { GeocodeResult } from './api'
import { Places, rankByFavorite } from './places'

// What the search box's list says under the field when it has no rows to offer, or above the rows after a failure.
export enum SearchStatus {
    Hint = 'hint',
    Searching = 'searching',
    Error = 'error',
    Offline = 'offline',
    Empty = 'empty',
}

interface SearchState {
    query: string
    resultCount: number
    isFetching: boolean
    isError: boolean
    isOffline: boolean
}

interface ListState {
    query: string
    initialQuery: string
    isOpen: boolean
    hasPlaces: boolean
}

// The geocoder is asked only from this many letters: shorter names match too much of the world.
const MIN_QUERY = 3

const byPopulation = (a: GeocodeResult, b: GeocodeResult) => (b.population ?? 0) - (a.population ?? 0)

const isEdited = (query: string, initialQuery: string) => query !== initialQuery

export const isQueryReady = (query: string) => query.trim().length >= MIN_QUERY

// The text the geocoder is asked: nothing until the field has been edited, so a switcher's current name never searches.
export const getSearchTerm = (query: string, initialQuery: string) =>
    isEdited(query, initialQuery) ? query.trim() : ''

// Results read largest place first, with the viewer's favorites ahead of the rest.
export const rankResults = (results: GeocodeResult[], places: Places | null) => {
    const sorted = [...results].sort(byPopulation)

    return places ? rankByFavorite(sorted, places) : sorted
}

export const getResultLabel = (result: GeocodeResult) =>
    [result.name, result.admin1, result.country].filter(Boolean).join(', ')

// While the text is untouched or empty the list offers the viewer's places instead of results.
export const isPlacesView = ({ query, initialQuery, hasPlaces }: Omit<ListState, 'isOpen'>) =>
    hasPlaces && (!isEdited(query, initialQuery) || !query.trim())

export const isListShown = ({ isOpen, ...state }: ListState) =>
    isOpen && (isPlacesView(state) || (isEdited(state.query, state.initialQuery) && state.query.trim().length > 0))

// An error line sits above the results it failed to replace; the other lines show only when there are no rows.
export const getSearchStatus = ({
    query,
    resultCount,
    isFetching,
    isError,
    isOffline,
}: SearchState): SearchStatus | null => {
    if (!isQueryReady(query)) return SearchStatus.Hint

    if (isError) return SearchStatus.Error

    if (resultCount) return null

    if (isOffline) return SearchStatus.Offline

    return isFetching ? SearchStatus.Searching : SearchStatus.Empty
}
