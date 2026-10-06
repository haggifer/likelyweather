import { City } from './api'
import { SEEDS, slugify, START_WITH_IDS } from './seeds'

export type Place = Pick<City, 'id' | 'slug' | 'name' | 'nameLocal' | 'admin1' | 'country' | 'countryCode'>

// The viewer's places: favorites in the order they were pinned, then recent searches, newest first.
export interface Places {
    favorites: Place[]
    recents: Place[]
}

export const MAX_PLACES = 4
// The chips show four places; the search box's list keeps a longer history.
const MAX_RECENTS = 50

// Keeps only what a chip shows: a city or a search result carries much more than storage needs.
export const toPlace = ({ id, slug, name, nameLocal, admin1, country, countryCode }: Place): Place => ({
    id,
    slug,
    name,
    nameLocal,
    admin1,
    country,
    countryCode,
})

export const DEFAULT_PLACES: Places = {
    favorites: [],
    recents: START_WITH_IDS.map((id) => SEEDS.find((s) => s.id === id)!).map((seed) =>
        toPlace({ ...seed, slug: slugify(seed.name, seed.countryCode, seed.id) }),
    ),
}

const hasPlace = (list: Place[], id: number) => list.some((p) => p.id === id)

const withoutPlace = (list: Place[], id: number) => list.filter((p) => p.id !== id)

const withNewestRecent = (recents: Place[], place: Place) =>
    [toPlace(place), ...withoutPlace(recents, place.id)].slice(0, MAX_RECENTS)

const withoutDuplicates = (list: Place[]) => list.filter((p, i) => list.findIndex((q) => q.id === p.id) === i)

const isPlace = (value: unknown): value is Place => {
    const place = value as Place

    return (
        typeof place === 'object' &&
        place !== null &&
        Number.isInteger(place.id) &&
        typeof place.slug === 'string' &&
        typeof place.name === 'string' &&
        typeof place.country === 'string' &&
        typeof place.countryCode === 'string'
    )
}

const toPlaceList = (value: unknown) => (Array.isArray(value) && value.every(isPlace) ? value : null)

// Stored data comes from an older version or a hand edit as often as from this one, so it is repaired, not trusted:
// favorites are capped, recents never repeat a favorite, and the defaults fill a short list back to four chips.
const repairPlaces = (favorites: Place[], recents: Place[]): Places => {
    const pinned = withoutDuplicates(favorites).slice(0, MAX_PLACES)
    const unpinned = withoutDuplicates(recents).filter((p) => !hasPlace(pinned, p.id))
    const fill = DEFAULT_PLACES.recents
        .filter((p) => !hasPlace(pinned, p.id) && !hasPlace(unpinned, p.id))
        .slice(0, Math.max(0, MAX_PLACES - pinned.length - unpinned.length))

    return { favorites: pinned, recents: [...unpinned, ...fill].slice(0, MAX_RECENTS) }
}

// A first visit starts from the largest places of the viewer's country, topped up with the defaults.
export const getStarterPlaces = (cities: Place[]): Places => repairPlaces([], cities.map(toPlace))

export const getPlaceChips = ({ favorites, recents }: Places): Place[] =>
    [...favorites, ...recents].slice(0, MAX_PLACES)

export const getPlaceList = ({ favorites, recents }: Places): Place[] =>
    [...favorites, ...recents].slice(0, MAX_RECENTS)

export const isFavorite = (places: Places, id: number) => hasPlace(places.favorites, id)

export const isPinnable = (places: Places, id: number) => isFavorite(places, id) || places.favorites.length < MAX_PLACES

// A favorite keeps its position, so only the chips after the favorites change.
export const addRecent = (places: Places, place: Place): Places =>
    isFavorite(places, place.id) ? places : { ...places, recents: withNewestRecent(places.recents, place) }

// A new favorite goes after the last one, so favorites never move once pinned.
export const pinPlace = (places: Places, place: Place): Places =>
    isFavorite(places, place.id) || !isPinnable(places, place.id)
        ? places
        : { favorites: [...places.favorites, toPlace(place)], recents: withoutPlace(places.recents, place.id) }

// The viewer has just touched an unpinned place, so it becomes the newest recent.
export const unpinPlace = (places: Places, place: Place): Places =>
    isFavorite(places, place.id)
        ? {
              favorites: withoutPlace(places.favorites, place.id),
              recents: withNewestRecent(places.recents, place),
          }
        : places

export const togglePlace = (places: Places, place: Place): Places =>
    isFavorite(places, place.id) ? unpinPlace(places, place) : pinPlace(places, place)

export const rankByFavorite = <T extends { id: number }>(results: T[], places: Places): T[] => [
    ...results.filter((r) => isFavorite(places, r.id)),
    ...results.filter((r) => !isFavorite(places, r.id)),
]

export const parsePlaces = (raw: string | null): Places => {
    try {
        const stored = JSON.parse(raw ?? 'null')
        const favorites = toPlaceList(stored?.favorites)
        const recents = toPlaceList(stored?.recents)

        return favorites && recents ? repairPlaces(favorites, recents) : DEFAULT_PLACES
    } catch {
        return DEFAULT_PLACES
    }
}
