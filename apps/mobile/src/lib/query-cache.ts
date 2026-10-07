import { makeQueryClient } from '@fa/api-client/query-client'
import NetInfo from '@react-native-community/netinfo'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { onlineManager } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { storage } from './storage'

const DAY_MS = 86_400_000
// Bump when the API contract or the shape of a persisted query changes: the app version alone is rarely bumped.
const CACHE_SCHEMA = 1

// Forecasts stay readable offline for a day: the cache is kept on the device and restored at start, and queries
// pause while the network is down instead of failing.
export const CACHE_MAX_AGE_MS = DAY_MS

// A cache written by another app version or schema is dropped at start rather than read with the wrong shape.
export const CACHE_BUSTER = `${Constants.expoConfig?.version ?? '0'}:${CACHE_SCHEMA}`

export const queryClient = makeQueryClient()

queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, gcTime: CACHE_MAX_AGE_MS },
})

export const queryPersister = createAsyncStoragePersister({
    key: 'fa.queries',
    storage: {
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => void storage.remove(key),
    },
})

onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
)
