import { apiGet } from '@/lib/api'
import { MINUTE } from '@/lib/query-keys'
import { TimelineResponse } from '@fa/shared/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'

export function useTimeline(days = 30): UseQueryResult<TimelineResponse, Error> {
    return useQuery({
        queryKey: ['timeline', days],
        queryFn: () => apiGet<TimelineResponse>('/runs/timeline', { days }),
        staleTime: MINUTE,
    })
}
