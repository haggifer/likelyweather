import { describe, expect, it } from 'vitest'
import {
    addRecent,
    canPin,
    DEFAULT_PLACES,
    getPlaceChips,
    parsePlaces,
    pinPlace,
    Place,
    Places,
    rankByFavorite,
    unpinPlace,
} from './places'

const place = (id: number, name: string): Place => ({
    id,
    slug: `${name.toLowerCase()}-${id}`,
    name,
    country: 'Country',
    countryCode: 'XX',
})

const NEW_YORK = place(1, 'New York')
const LONDON = place(2, 'London')
const PARIS = place(3, 'Paris')
const KYIV = place(4, 'Kyiv')
const BERLIN = place(5, 'Berlin')
const TOKYO = place(6, 'Tokyo')
const SYDNEY = place(7, 'Sydney')

const START: Places = { favorites: [], recents: [NEW_YORK, LONDON, PARIS, KYIV] }

const names = (places: Places) => getPlaceChips(places).map((p) => p.name)

describe('places', () => {
    it('replaces the oldest chip with each new search, newest first', () => {
        expect(names(addRecent(START, BERLIN))).toEqual(['Berlin', 'New York', 'London', 'Paris'])
    })

    it('moves a place searched again to the front without dropping anything', () => {
        expect(names(addRecent(START, PARIS))).toEqual(['Paris', 'New York', 'London', 'Kyiv'])
    })

    it('pins a place after the last favorite, and later searches only replace the chips after the favorites', () => {
        const pinned = pinPlace(pinPlace(START, NEW_YORK), PARIS)

        expect(names(pinned)).toEqual(['New York', 'Paris', 'London', 'Kyiv'])

        const searched = addRecent(addRecent(pinned, BERLIN), TOKYO)

        expect(names(searched)).toEqual(['New York', 'Paris', 'Tokyo', 'Berlin'])
        expect(names(addRecent(searched, PARIS))).toEqual(['New York', 'Paris', 'Tokyo', 'Berlin'])
        expect(names(addRecent(searched, BERLIN))).toEqual(['New York', 'Paris', 'Berlin', 'Tokyo'])
    })

    it('pins a place that is not a chip, dropping the oldest recent chip', () => {
        expect(names(pinPlace(START, BERLIN))).toEqual(['Berlin', 'New York', 'London', 'Paris'])
    })

    it('makes an unpinned place the newest recent, keeping four chips', () => {
        const pinned = pinPlace(pinPlace(START, NEW_YORK), PARIS)

        expect(names(unpinPlace(pinned, PARIS))).toEqual(['New York', 'Paris', 'London', 'Kyiv'])
        expect(names(unpinPlace(pinned, NEW_YORK))).toEqual(['Paris', 'New York', 'London', 'Kyiv'])
    })

    it('stores only the fields a chip shows', () => {
        const city = { ...BERLIN, status: 'ACTIVE', population: 3_500_000 }

        expect(pinPlace(START, city).favorites[0]).toEqual(BERLIN)
        expect(addRecent(START, city).recents[0]).toEqual(BERLIN)
    })

    it('allows four favorites at most', () => {
        const full = [NEW_YORK, LONDON, PARIS, KYIV].reduce(pinPlace, START)

        expect(canPin(full, BERLIN.id)).toBe(false)
        expect(canPin(full, PARIS.id)).toBe(true)
        expect(pinPlace(full, BERLIN)).toBe(full)
        expect(names(addRecent(full, SYDNEY))).toEqual(['New York', 'London', 'Paris', 'Kyiv'])
    })

    it('puts favorite search results first and keeps the rest in order', () => {
        const pinned = pinPlace(START, PARIS)

        expect(rankByFavorite([LONDON, BERLIN, PARIS], pinned).map((p) => p.name)).toEqual([
            'Paris',
            'London',
            'Berlin',
        ])
    })

    it('falls back to the defaults for missing or broken storage, and repairs a short or overlapping list', () => {
        expect(parsePlaces(null)).toEqual(DEFAULT_PLACES)
        expect(parsePlaces('{not json')).toEqual(DEFAULT_PLACES)
        expect(parsePlaces(JSON.stringify({ favorites: [{ id: 'x' }], recents: 3 }))).toEqual(DEFAULT_PLACES)

        const repaired = parsePlaces(JSON.stringify({ favorites: [BERLIN], recents: [BERLIN, TOKYO] }))

        expect(repaired.favorites).toEqual([BERLIN])
        expect(getPlaceChips(repaired).map((p) => p.id)).toEqual([
            BERLIN.id,
            TOKYO.id,
            DEFAULT_PLACES.recents[0].id,
            DEFAULT_PLACES.recents[1].id,
        ])
    })
})
