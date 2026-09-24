import { LEAD_BUCKETS, SKILL_WINDOWS } from '@/shared/constants'
import { Variable } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboardSlice'
import { FiltersState, hydrateFilters } from '@/store/filtersSlice'
import { parseAsNumberLiteral, parseAsString, parseAsStringEnum, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useEffect } from 'react'

export type SyncKey = 'variable' | 'window' | 'mode' | 'lead' | 'validTime'

export interface UseUrlSyncResult {
    isHydrated: boolean
}

const PARSERS = {
    v: parseAsStringEnum<Variable>(Object.values(Variable)),
    window: parseAsNumberLiteral(SKILL_WINDOWS),
    mode: parseAsStringLiteral(['consensus', 'self'] as const),
    lead: parseAsNumberLiteral(LEAD_BUCKETS),
    t: parseAsString,
}

const DEFAULTS = { v: Variable.Temp, window: 30, mode: 'consensus', lead: 24, t: null }

const orNull = <T>(value: T, fallback: unknown, enabled: boolean) => (enabled && value !== fallback ? value : null)

// Redux owns the filter state; the URL mirrors it so any scoreboard or evolution view is linkable. On mount the
// page's keys are read from the URL once, then Redux writes back. Queries wait for `isHydrated` so a deep link
// never fires a wasted request with the default filters first.
export default function useUrlSync(keys: SyncKey[]): UseUrlSyncResult {
    const dispatch = useAppDispatch()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const filters = useAppSelector((s) => s.filters)
    const [params, setParams] = useQueryStates(PARSERS, { history: 'replace' })
    const has = (key: SyncKey) => keys.includes(key)

    useEffect(() => {
        const patch: Partial<Omit<FiltersState, 'hydrated'>> = {}

        if (has('window') && params.window) patch.window = params.window

        if (has('mode') && params.mode) patch.mode = params.mode

        if (has('lead') && params.lead) patch.lead = params.lead

        if (has('validTime') && params.t) patch.validTime = params.t

        if (has('variable') && params.v) dispatch(setVariable(params.v))

        dispatch(hydrateFilters(patch))
        // Runs once per page mount: later URL writes come from Redux, not the other way round.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!filters.hydrated) return

        void setParams({
            v: orNull(variable, DEFAULTS.v, has('variable')),
            window: orNull(filters.window, DEFAULTS.window, has('window')),
            mode: orNull(filters.mode, DEFAULTS.mode, has('mode')),
            lead: orNull(filters.lead, DEFAULTS.lead, has('lead')),
            t: orNull(filters.validTime, DEFAULTS.t, has('validTime')),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variable, filters])

    return { isHydrated: filters.hydrated }
}
