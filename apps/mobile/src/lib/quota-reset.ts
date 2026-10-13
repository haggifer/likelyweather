import { QuotaResponse } from '@fa/shared/api'
import { isQuotaCurrent } from '@fa/shared/quota'
import { QueryClient } from '@tanstack/react-query'

const QUOTA_KEY = ['quota']

// A count restored from the device after its reset time is yesterday's: dropping it makes Settings wait for the
// server's answer instead of showing the old count, as the web ignores its stored count past `resetsAt`.
export const dropExpiredQuota = (client: QueryClient, now: Date) => {
    const quota = client.getQueryData<QuotaResponse>(QUOTA_KEY)

    if (quota && !isQuotaCurrent(quota, now)) client.removeQueries({ queryKey: QUOTA_KEY, exact: true })
}
