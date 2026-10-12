export interface StoredValue<T> {
    getSnapshot: () => T
    getServerSnapshot: () => T
    subscribe: (onChange: () => void) => () => void
    set: (update: (current: T) => T) => void
}

// A setting kept as JSON under one local-storage key, for `useSyncExternalStore`: parsed once and cached, so the same
// object comes back until it changes; `parse` repairs whatever is stored (an older version, or nothing). The server
// can't read the viewer's storage, so it renders `fallback`, and the stored value applies right after hydration.
// Another tab's change arrives through the `storage` event.
export const createStoredValue = <T>(key: string, parse: (raw: string | null) => T, fallback: T): StoredValue<T> => {
    const changeEvent = `${key}:change`
    let current: T | null = null

    const read = () => {
        try {
            return parse(localStorage.getItem(key))
        } catch {
            return parse(null)
        }
    }

    const getSnapshot = () => (current ??= read())

    const subscribe = (onChange: () => void) => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key !== key) return

            current = null
            onChange()
        }

        window.addEventListener(changeEvent, onChange)
        window.addEventListener('storage', handleStorage)

        return () => {
            window.removeEventListener(changeEvent, onChange)
            window.removeEventListener('storage', handleStorage)
        }
    }

    const set = (update: (value: T) => T) => {
        current = update(getSnapshot())

        try {
            localStorage.setItem(key, JSON.stringify(current))
        } catch {
            // storage can be blocked; the change still applies until the page is reloaded
        }

        window.dispatchEvent(new Event(changeEvent))
    }

    return { getSnapshot, getServerSnapshot: () => fallback, subscribe, set }
}
