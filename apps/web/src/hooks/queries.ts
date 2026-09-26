import { apiGet, apiPost } from '@/lib/api'
import {
    City,
    CityDetail,
    CityStatus,
    CompareResponse,
    GeocodeResponse,
    LatestResponse,
    Locale,
    QuotaResponse,
    RunsResponse,
    TimelineResponse,
    TrackResponse,
} from '@/shared/api'
import { Variable, VARIABLES } from '@/shared/variables'
import {
    keepPreviousData,
    useMutation,
    UseMutationResult,
    useQueries,
    useQuery,
    UseQueryResult,
} from '@tanstack/react-query'

const MINUTE = 60_000
const LATEST_REFETCH_MS = 15 * MINUTE

export const useCity = (slug: string): UseQueryResult<CityDetail, Error> =>
    useQuery({
        queryKey: ['city', slug],
        queryFn: () => apiGet<CityDetail>(`/cities/${slug}`),
        staleTime: 5 * MINUTE,
        retry: (count, error) => count < 2 && !error.message.includes('No tracked city'),
    })

const getLatestQuery = (slug: string, variable: Variable) => ({
    queryKey: ['latest', slug, variable],
    queryFn: () => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable }),
})

// The hourly grid of one variable, shared with the landing overview's cache; the dashboard builds its local 3-hour
// slots from it and re-anchors them whenever this refetches.
export const useLatest = (slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> =>
    useQuery({
        ...getLatestQuery(slug, variable),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * MINUTE,
        refetchInterval: LATEST_REFETCH_MS,
        placeholderData: keepPreviousData,
    })

// Hourly series of every variable for the landing overview. The chart is anchored to the moment the data arrived,
// so it is never refetched in the background: only an explicit refresh re-anchors it. No placeholder data either,
// because switching cities must never show the previous one.
export const useHourlyAll = (slug: string, enabled = true): UseQueryResult<LatestResponse, Error>[] =>
    useQueries({
        queries: VARIABLES.map((v) => ({
            ...getLatestQuery(slug, v.id),
            enabled: Boolean(slug) && enabled,
            staleTime: Infinity,
            refetchOnWindowFocus: false,
        })),
    })

// Refetched whenever a request that can spend quota settles (see `makeQueryClient`).
export const useQuota = (): UseQueryResult<QuotaResponse, Error> =>
    useQuery({ queryKey: ['quota'], queryFn: () => apiGet<QuotaResponse>('/quota'), staleTime: 5 * MINUTE })

export const useGeocode = (q: string, locale: Locale): UseQueryResult<GeocodeResponse, Error> =>
    useQuery({
        queryKey: ['geocode', locale, q.toLowerCase()],
        queryFn: () => apiGet<GeocodeResponse>('/geocode', { q, locale }),
        enabled: q.trim().length >= 3,
        staleTime: 60 * MINUTE,
        placeholderData: keepPreviousData,
    })

export const useCities = (status?: CityStatus): UseQueryResult<{ items: City[] }, Error> =>
    useQuery({
        queryKey: ['cities', status ?? 'all'],
        queryFn: () => apiGet<{ items: City[] }>('/cities', { status }),
        staleTime: 5 * MINUTE,
    })

export const useRuns = (): UseQueryResult<RunsResponse, Error> =>
    useQuery({
        queryKey: ['runs'],
        queryFn: () => apiGet<RunsResponse>('/runs', { limit: 500 }),
        staleTime: MINUTE,
    })

export const useTimeline = (days = 30): UseQueryResult<TimelineResponse, Error> =>
    useQuery({
        queryKey: ['timeline', days],
        queryFn: () => apiGet<TimelineResponse>('/runs/timeline', { days }),
        staleTime: MINUTE,
    })

export const useCompare = (slugs: string[], variable: Variable): UseQueryResult<CompareResponse, Error> =>
    useQuery({
        queryKey: ['compare', slugs.join(','), variable],
        queryFn: () => apiGet<CompareResponse>('/compare', { cities: slugs.join(','), variable }),
        enabled: slugs.length > 0,
        staleTime: 5 * MINUTE,
        placeholderData: keepPreviousData,
    })

export const useTrackCity = (): UseMutationResult<TrackResponse, Error, number> =>
    useMutation({ mutationFn: (geocodeId: number) => apiPost<TrackResponse>('/cities/track', { geocodeId }) })
