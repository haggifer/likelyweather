import { LatestResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { apiGet } from './api'

export const MINUTE = 60_000
export const LATEST_REFETCH_MS = 15 * MINUTE

export const getLatestQuery = (slug: string, variable: Variable) => ({
    queryKey: ['latest', slug, variable],
    queryFn: () => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable }),
})
