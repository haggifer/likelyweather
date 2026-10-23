import { ArchiveResponse } from '@fa/shared/api'
import { ArchiveRange, toPeriodArchive } from '@fa/shared/archive'
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query'
import { apiGet } from '../api'

// Past weather never changes, so an answer is kept for the session and never refetched; a period the API has not
// stored yet costs the viewer one request the first time.
export function useArchive(slug: string | null, range: ArchiveRange | null): UseQueryResult<ArchiveResponse, Error> {
    return useQuery({
        queryKey: ['archive', slug, range?.from, range?.to],
        queryFn: () =>
            apiGet<ArchiveResponse>(`/cities/${encodeURIComponent(slug!)}/archive`, {
                from: range!.from,
                to: range!.to,
            }),
        enabled: Boolean(slug && range),
        select: toPeriodArchive,
        staleTime: Infinity,
        // Another period keeps the last chart on screen until its own arrives.
        placeholderData: keepPreviousData,
        // The API spends the unit before it asks Open-Meteo, so a retry after a failed fetch would charge it twice;
        // the reader retries from the error notice.
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    })
}
