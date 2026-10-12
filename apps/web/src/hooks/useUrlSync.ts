import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboard-slice'
import { Variable } from '@fa/shared/variables'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'

export interface UseUrlSyncResult {
    isHydrated: boolean
}

const variableParser = parseAsStringEnum<Variable>(Object.values(Variable))

// Redux owns the chosen variable; the URL mirrors it (`?v=`) so a dashboard view is linkable. On mount
// the URL is read once, then Redux writes back. Queries wait for `isHydrated` so a deep link never fires a wasted
// request with the default variable first. The flag is local to the mount: a page-wide flag would stay true after
// the first page and let the next page query before reading its own URL.
export function useUrlSync(): UseUrlSyncResult {
    const dispatch = useAppDispatch()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const [param, setParam] = useQueryState('v', variableParser.withOptions({ history: 'replace' }))

    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        if (param) dispatch(setVariable(param))

        // Redux can only take the URL's variable after the mount commits; this one extra render holds the queries back.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsHydrated(true)
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
