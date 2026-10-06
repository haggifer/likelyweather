import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/latest-query'
import { getQuotaSnapshot, getServerQuotaSnapshot, storeQuota, subscribeQuota } from '@/lib/quota-store'
import { QuotaResponse } from '@fa/shared/api'
import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export interface UseQuotaResult {
    quota: QuotaResponse | null
}

const fetchQuota = async () => {
    const quota = await apiGet<QuotaResponse>('/quota')

    storeQuota(quota)

    return quota
}

// Refetched whenever a request that can spend quota settles (see `makeQueryClient`). Until the first answer the
// last stored one stands in, so the meter is there as soon as the page is, without a blink.
export function useQuota(): UseQuotaResult {
    const stored = useSyncExternalStore(subscribeQuota, getQuotaSnapshot, getServerQuotaSnapshot)

    const { data } = useQuery({ queryKey: ['quota'], queryFn: fetchQuota, staleTime: 5 * MINUTE })

    return { quota: data ?? stored }
}
