import { ArchiveResponse } from '@fa/shared/api'
import { ArchiveRange } from '@fa/shared/archive'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'

// Past weather never changes, so an answer is kept for the session and never refetched; a period the API has not
// stored yet costs the viewer one request the first time.
export function useArchive(slug: string | null, range: ArchiveRange | null): UseQueryResult<ArchiveResponse, Error> {
    return useQuery({
        queryKey: ['archive', slug, range?.from, range?.to],
        queryFn: () => apiGet<ArchiveResponse>(`/cities/${slug}/archive`, { from: range!.from, to: range!.to }),
        enabled: Boolean(slug && range),
        staleTime: Infinity,
        // Another period keeps the last chart on screen until its own arrives.
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    })
}
