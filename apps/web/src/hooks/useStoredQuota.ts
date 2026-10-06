import { getQuotaSnapshot, getServerQuotaSnapshot, storeQuota, subscribeQuota } from '@/lib/quota-store'
import { useQuota } from '@fa/api-client/hooks/useQuota'
import { QuotaResponse } from '@fa/shared/api'
import { useEffect, useSyncExternalStore } from 'react'

export interface UseStoredQuotaResult {
    quota: QuotaResponse | null
}

// The shared quota query, with the browser's last stored answer standing in until it returns, so the meter is there
// as soon as the page is, without a blink. Storage is the web's business, so the shared hook knows nothing of it.
export function useStoredQuota(): UseStoredQuotaResult {
    const stored = useSyncExternalStore(subscribeQuota, getQuotaSnapshot, getServerQuotaSnapshot)

    const { data } = useQuota()

    useEffect(() => {
        if (data) storeQuota(data)
    }, [data])

    return { quota: data ?? stored }
}
