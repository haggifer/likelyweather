import { makeQueryClient } from '@fa/api-client/query-client'
import NetInfo from '@react-native-community/netinfo'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { onlineManager } from '@tanstack/react-query'
import { storage } from './storage'

const DAY_MS = 86_400_000

// Forecasts stay readable offline for a day: the cache is kept on the device and restored at start, and queries
// pause while the network is down instead of failing.
export const CACHE_MAX_AGE_MS = DAY_MS

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
