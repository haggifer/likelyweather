import { createPersistedValue, KeyValueStorage, PersistedValue } from '@fa/shared/persisted-value'
import { storage } from './storage'

const DEVICE_STORAGE: KeyValueStorage = {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
}

// A value kept on the device for `useSyncExternalStore` (the shared contract in `@fa/shared/persisted-value`). Only
// the app writes its storage, so nothing outside it changes a value behind the cache.
export const createStoredValue = <T>(key: string, parse: (raw: string | null) => T): PersistedValue<T> =>
    createPersistedValue(DEVICE_STORAGE, key, parse)
