import { Variable } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboardSlice'
import { FiltersState, hydrateFilters } from '@/store/filtersSlice'
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs'
import { useEffect } from 'react'

export type SyncKey = 'variable' | 'validTime'

export interface UseUrlSyncResult {
    isHydrated: boolean
}

const PARSERS = {
    v: parseAsStringEnum<Variable>(Object.values(Variable)),
    t: parseAsString,
}

const DEFAULTS = { v: Variable.Temp, t: null }

const orNull = <T>(value: T, fallback: unknown, enabled: boolean) => (enabled && value !== fallback ? value : null)

// Redux owns the filter state; the URL mirrors it so any dashboard or evolution view is linkable. On mount the
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
            t: orNull(filters.validTime, DEFAULTS.t, has('validTime')),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variable, filters])

    return { isHydrated: filters.hydrated }
}
