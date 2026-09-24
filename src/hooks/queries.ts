import { apiGet, apiPost } from '@/lib/api'
import {
    City,
    CityDetail,
    CityStatus,
    CompareResponse,
    EvolutionResponse,
    GeocodeResponse,
    LatestResponse,
    Locale,
    ModelDetailResponse,
    RunsResponse,
    ScoreboardResponse,
    StepsResponse,
    TimelineResponse,
    TrackResponse,
    TruthMode,
} from '@/shared/api'
import { SkillWindow } from '@/shared/constants'
import { ModelId } from '@/shared/models'
import { Variable } from '@/shared/variables'
import { keepPreviousData, useMutation, UseMutationResult, useQuery, UseQueryResult } from '@tanstack/react-query'

const MINUTE = 60_000
const LATEST_REFETCH_MS = 15 * MINUTE

export const useCity = (slug: string): UseQueryResult<CityDetail, Error> =>
    useQuery({
        queryKey: ['city', slug],
        queryFn: () => apiGet<CityDetail>(`/cities/${slug}`),
        staleTime: 5 * MINUTE,
        retry: (count, error) => count < 2 && !error.message.includes('No tracked city'),
    })

export const useLatest = (slug: string, variable: Variable, enabled = true): UseQueryResult<LatestResponse, Error> =>
    useQuery({
        queryKey: ['latest', slug, variable],
        queryFn: () => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable }),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * MINUTE,
        refetchInterval: LATEST_REFETCH_MS,
        placeholderData: keepPreviousData,
    })

export interface ScoreboardParams {
    variable: Variable
    window: SkillWindow
    mode: TruthMode
}

export const useScoreboard = (
    slug: string,
    { variable, window, mode }: ScoreboardParams,
    enabled = true,
): UseQueryResult<ScoreboardResponse, Error> =>
    useQuery({
        queryKey: ['scoreboard', slug, variable, window, mode],
        queryFn: () => apiGet<ScoreboardResponse>(`/cities/${slug}/scoreboard`, { variable, window, mode }),
        enabled: Boolean(slug) && enabled,
        staleTime: 30 * MINUTE,
        placeholderData: keepPreviousData,
    })

export const useSteps = (slug: string): UseQueryResult<StepsResponse, Error> =>
    useQuery({
        queryKey: ['steps', slug],
        queryFn: () => apiGet<StepsResponse>(`/cities/${slug}/steps`),
        staleTime: 30 * MINUTE,
    })

export const useEvolution = (
    slug: string,
    variable: Variable,
    validTime: string | null,
): UseQueryResult<EvolutionResponse, Error> =>
    useQuery({
        queryKey: ['evolution', slug, variable, validTime],
        queryFn: () => apiGet<EvolutionResponse>(`/cities/${slug}/evolution`, { variable, validTime }),
        enabled: Boolean(slug && validTime),
        staleTime: 30 * MINUTE,
        placeholderData: keepPreviousData,
    })

export const useGeocode = (q: string, locale: Locale): UseQueryResult<GeocodeResponse, Error> =>
    useQuery({
        queryKey: ['geocode', locale, q.toLowerCase()],
        queryFn: () => apiGet<GeocodeResponse>('/geocode', { q, locale }),
        enabled: q.trim().length >= 3,
        staleTime: 60 * MINUTE,
        placeholderData: keepPreviousData,
    })

export const usePopularCities = (limit = 6): UseQueryResult<City[], Error> =>
    useQuery({
        queryKey: ['popular', limit],
        queryFn: () => apiGet<City[]>('/cities/popular', { limit }),
        staleTime: 5 * MINUTE,
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

export const useModelDetail = (
    id: ModelId,
    variable: Variable,
    window: SkillWindow,
    enabled = true,
): UseQueryResult<ModelDetailResponse, Error> =>
    useQuery({
        queryKey: ['model', id, variable, window],
        queryFn: () => apiGet<ModelDetailResponse>(`/models/${id}`, { variable, window }),
        enabled,
        staleTime: 30 * MINUTE,
        placeholderData: keepPreviousData,
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
