import { Variable } from '@fa/shared/variables'
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState, useSyncExternalStore } from 'react'
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

// The variable shared by the City screens in the stack. The `v` param read when the screen opened wins on the first render, before
// the shared store has taken it, so a deep link never queries the previous variable first. A screen left under another
// in the stack keeps its variable until it is shown again: its queries would otherwise fetch a variable nobody looks
// at, and a city due for a refresh would spend the viewer's quota for it.
export function useSelectedVariable(): UseSelectedVariableResult {
    const router = useRouter()
    const isFocused = useIsFocused()
    const params = useLocalSearchParams<{ v?: string }>()
    const current = useSyncExternalStore(subscribeSelectedVariable, getSelectedVariableState)

    const [entry] = useState(() => ({ variable: parseVariable(params.v), version: getSelectedVariableState().version }))
    const [shown, setShown] = useState(() => resolveVariable(entry, current))

    const variable = resolveVariable(entry, current)

    if (isFocused && shown !== variable) setShown(variable)

    const setVariable = (next: Variable) => {
        setSelectedVariable(next)
        router.setParams({ v: next })
    }

    useEffect(() => {
        if (entry.variable) setSelectedVariable(entry.variable)
    }, [entry])

    return { variable: isFocused ? variable : shown, setVariable }
}
