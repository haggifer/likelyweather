import { storage } from './storage'

export interface StoredValue<T> {
    get: () => T
    set: (update: (current: T) => T) => void
    subscribe: (onChange: () => void) => () => void
}

// A value kept as JSON under one key, parsed once and cached, so `useSyncExternalStore` gets the same object back
// until it changes. `parse` repairs whatever is stored (an older version, or nothing) into a valid value.
export const createStoredValue = <T>(key: string, parse: (raw: string | null) => T): StoredValue<T> => {
    const listeners = new Set<() => void>()
    let current: T | null = null

    const get = () => (current ??= parse(storage.getString(key) ?? null))

    const set = (update: (value: T) => T) => {
        current = update(get())
        storage.set(key, JSON.stringify(current))
        listeners.forEach((listener) => listener())
    }

    const subscribe = (onChange: () => void) => {
        listeners.add(onChange)

        return () => void listeners.delete(onChange)
    }

    return { get, set, subscribe }
}
