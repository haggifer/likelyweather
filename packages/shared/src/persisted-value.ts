// The storage each app keeps its settings in: the browser's localStorage on the web, MMKV in the app.
export interface KeyValueStorage {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
}

export interface PersistedValue<T> {
    get: () => T
    set: (update: (current: T) => T) => void
    subscribe: (onChange: () => void) => () => void
    // Drops the cached value, so the next `get` reads the storage again: for a change made elsewhere, like another tab.
    reload: () => void
}

// A value kept as JSON under one key, parsed once and cached, so `useSyncExternalStore` gets the same object back
// until it changes. `parse` repairs whatever is stored (an older version, or nothing) into a valid value. Storage that
// fails (a browser that blocks it) reads as nothing, and a change still applies until the app is reloaded.
export const createPersistedValue = <T>(
    storage: KeyValueStorage,
    key: string,
    parse: (raw: string | null) => T,
): PersistedValue<T> => {
    const listeners = new Set<() => void>()
    let current: T | null = null

    const read = () => {
        try {
            return parse(storage.getItem(key))
        } catch {
            return parse(null)
        }
    }

    const get = () => (current ??= read())

    const set = (update: (value: T) => T) => {
        current = update(get())

        try {
            storage.setItem(key, JSON.stringify(current))
        } catch {
            // the change still applies for this session
        }

        listeners.forEach((listener) => listener())
    }

    const subscribe = (onChange: () => void) => {
        listeners.add(onChange)

        return () => void listeners.delete(onChange)
    }

    const reload = () => {
        current = null
    }

    return { get, set, subscribe, reload }
}
