import { useSyncExternalStore } from 'react'

interface MediaQueryStore {
    subscribe: (onChange: () => void) => () => void
    getSnapshot: () => boolean
}

// Server rendering reads only the server snapshot, and has no `window` to build a list from.
const SERVER_STORE: MediaQueryStore = { subscribe: () => () => {}, getSnapshot: () => false }

// One list and one subscribe per query, so useSyncExternalStore keeps its subscription across renders.
const STORES = new Map<string, MediaQueryStore>()

const createStore = (query: string): MediaQueryStore => {
    const list = window.matchMedia(query)

    return {
        subscribe: (onChange) => {
            list.addEventListener('change', onChange)

            return () => list.removeEventListener('change', onChange)
        },
        getSnapshot: () => list.matches,
    }
}

const getStore = (query: string) => {
    const cached = STORES.get(query)

    if (cached) return cached

    const store = createStore(query)
    STORES.set(query, store)

    return store
}

const getServerSnapshot = () => false

// False during server rendering and hydration, so markup that depends on it never mismatches the server HTML.
export function useMediaQuery(query: string): boolean {
    const store = typeof window === 'undefined' ? SERVER_STORE : getStore(query)

    return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
}
