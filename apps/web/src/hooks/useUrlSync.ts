import { Variable } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { markUrlHydrated, setVariable } from '@/store/dashboardSlice'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useEffect } from 'react'

export interface UseUrlSyncResult {
    isHydrated: boolean
}

const variableParser = parseAsStringEnum<Variable>(Object.values(Variable))

// Redux owns the chosen variable; the URL mirrors it (`?v=`) so a dashboard or compare view is linkable. On mount
// the URL is read once, then Redux writes back. Queries wait for `isHydrated` so a deep link never fires a wasted
// request with the default variable first.
export default function useUrlSync(): UseUrlSyncResult {
    const dispatch = useAppDispatch()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const isHydrated = useAppSelector((s) => s.dashboard.isUrlHydrated)
    const [param, setParam] = useQueryState('v', variableParser.withOptions({ history: 'replace' }))

    useEffect(() => {
        if (param) dispatch(setVariable(param))

        dispatch(markUrlHydrated())
        // Runs once per page mount: later URL writes come from Redux, not the other way round.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!isHydrated) return

        void setParam(variable === Variable.Temp ? null : variable)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variable, isHydrated])

    return { isHydrated }
}
