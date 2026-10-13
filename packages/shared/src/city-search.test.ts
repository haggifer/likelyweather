import { GeocodeResult } from './api'
import {
    getResultLabel,
    getSearchStatus,
    getSearchTerm,
    isListShown,
    isPlacesView,
    isQueryReady,
    rankResults,
    SearchStatus,
} from './city-search'
import { toPlace } from './places'

const toResult = (id: number, name: string, population?: number): GeocodeResult => ({
    id,
    name,
    country: 'France',
    countryCode: 'FR',
    lat: 48.85,
    lon: 2.35,
    timezone: 'Europe/Paris',
    population,
})

const READY = { query: 'Paris', resultCount: 0, isFetching: false, isError: false, isOffline: false }

describe('isQueryReady', () => {
    it('needs three letters, not counting the spaces around them', () => {
        expect(isQueryReady('Pa')).toBe(false)
        expect(isQueryReady('  Pa  ')).toBe(false)
        expect(isQueryReady('Par')).toBe(true)
    })
})

describe('getSearchTerm', () => {
    it('asks nothing until the starting text is edited, then the trimmed text', () => {
        expect(getSearchTerm('Kyiv', 'Kyiv')).toBe('')
        expect(getSearchTerm(' Paris ', 'Kyiv')).toBe('Paris')
        expect(getSearchTerm('Paris', '')).toBe('Paris')
    })
})

describe('rankResults', () => {
    it('puts the largest place first and the favorites ahead of it', () => {
        const small = toResult(1, 'Small', 10)
        const large = toResult(2, 'Large', 1000)
        const unknown = toResult(3, 'Unknown')
        const places = { favorites: [toPlace({ ...small, slug: 'small' })], recents: [] }

        expect(rankResults([small, unknown, large], null)).toEqual([large, small, unknown])
        expect(rankResults([small, unknown, large], places)).toEqual([small, large, unknown])
    })
})

describe('getResultLabel', () => {
    it('names the place, its region and its country', () => {
        expect(getResultLabel({ ...toResult(1, 'Odessa'), admin1: 'Texas', country: 'United States' })).toBe(
            'Odessa, Texas, United States',
        )
        expect(getResultLabel(toResult(1, 'Paris'))).toBe('Paris, France')
    })
})

describe('isPlacesView and isListShown', () => {
    it('offer the places while the text is untouched or empty, and results once it is edited', () => {
        expect(isPlacesView({ query: 'Kyiv', initialQuery: 'Kyiv', hasPlaces: true })).toBe(true)
        expect(isPlacesView({ query: ' ', initialQuery: 'Kyiv', hasPlaces: true })).toBe(true)
        expect(isPlacesView({ query: 'Par', initialQuery: 'Kyiv', hasPlaces: true })).toBe(false)
        expect(isListShown({ query: 'Par', initialQuery: 'Kyiv', hasPlaces: true, isOpen: true })).toBe(true)
    })

    it('keep the list closed before the places are read and nothing is typed', () => {
        const state = { query: '', initialQuery: '', hasPlaces: false, isOpen: true }

        expect(isPlacesView(state)).toBe(false)
        expect(isListShown(state)).toBe(false)
        expect(isListShown({ ...state, query: 'P' })).toBe(true)
        expect(isListShown({ ...state, query: 'P', isOpen: false })).toBe(false)
    })
})

describe('getSearchStatus', () => {
    it('asks for more letters first', () => {
        expect(getSearchStatus({ ...READY, query: 'Pa', isError: true })).toBe(SearchStatus.Hint)
    })

    it('reports a failure even above the results it kept', () => {
        expect(getSearchStatus({ ...READY, isError: true, resultCount: 2 })).toBe(SearchStatus.Error)
    })

    it('says nothing while there are results', () => {
        expect(getSearchStatus({ ...READY, resultCount: 2, isFetching: true })).toBeNull()
    })

    it('tells offline, searching and nothing found apart', () => {
        expect(getSearchStatus({ ...READY, isOffline: true, isFetching: true })).toBe(SearchStatus.Offline)
        expect(getSearchStatus({ ...READY, isFetching: true })).toBe(SearchStatus.Searching)
        expect(getSearchStatus(READY)).toBe(SearchStatus.Empty)
    })
})
