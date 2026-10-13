import { createPersistedValue, KeyValueStorage } from '@fa/shared/persisted-value'

export interface StoredValue<T> {
    getSnapshot: () => T
    getServerSnapshot: () => T
    subscribe: (onChange: () => void) => () => void
    set: (update: (current: T) => T) => void
}

// Read through a function each time: `localStorage` itself throws where the browser blocks storage.
const LOCAL_STORAGE: KeyValueStorage = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
}

// A setting kept in local storage for `useSyncExternalStore` (the shared contract in `@fa/shared/persisted-value`).
// The server can't read the viewer's storage, so it renders `fallback`, and the stored value applies right after
// hydration. Another tab's change arrives through the `storage` event.
export const createStoredValue = <T>(key: string, parse: (raw: string | null) => T, fallback: T): StoredValue<T> => {
    const value = createPersistedValue(LOCAL_STORAGE, key, parse)

    const subscribe = (onChange: () => void) => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key !== key) return

            value.reload()
            onChange()
        }

        const unsubscribe = value.subscribe(onChange)
        window.addEventListener('storage', handleStorage)

        return () => {
            unsubscribe()
            window.removeEventListener('storage', handleStorage)
        }
    }

    return { getSnapshot: value.get, getServerSnapshot: () => fallback, subscribe, set: value.set }
}
