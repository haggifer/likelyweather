import { Variable } from '@fa/shared/variables'
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router'
import { startTransition, useEffect, useState, useSyncExternalStore } from 'react'
import {
    getSelectedVariableState,
    parseVariable,
    resolveVariable,
    setSelectedVariable,
    subscribeSelectedVariable,
} from '../lib/selected-variable-store'

export interface UseSelectedVariableResult {
    variable: Variable
    setVariable: (variable: Variable) => void
}

// The `v` param read when the screen opened wins on the first render, before the shared store has taken it, so a deep
// link never queries the previous variable first. A screen left under another in the stack keeps its variable until it
// is shown again: its queries would otherwise fetch a variable nobody looks at, and a city due for a refresh would
// spend the viewer's quota for it.
export function useSelectedVariable(): UseSelectedVariableResult {
    const router = useRouter()
    const isFocused = useIsFocused()
    const params = useLocalSearchParams<{ v?: string }>()
    const current = useSyncExternalStore(subscribeSelectedVariable, getSelectedVariableState)

    const [entry] = useState(() => ({ variable: parseVariable(params.v), version: getSelectedVariableState().version }))
    const [shown, setShown] = useState(() => resolveVariable(entry, current))

    const variable = resolveVariable(entry, current)

    if (isFocused && shown !== variable) setShown(variable)

    // The store answers the tap at once; the param only mirrors it for links, so it updates the navigation state
    // in the background rather than in the tap's own render.
    const setVariable = (next: Variable) => {
        setSelectedVariable(next)
        startTransition(() => router.setParams({ v: next }))
    }

    useEffect(() => {
        if (entry.variable) setSelectedVariable(entry.variable)
    }, [entry])

    return { variable: isFocused ? variable : shown, setVariable }
}
