import { Variable } from '@fa/shared/variables'

export interface SelectedVariableState {
    variable: Variable | null
    // Counts the changes, so a screen can tell whether the variable changed anywhere since it opened.
    version: number
}

const VARIABLE_IDS = new Set<string>(Object.values(Variable))

const listeners = new Set<() => void>()
let state: SelectedVariableState = { variable: null, version: 0 }

// The variable the City screens show, kept in memory for the session like the web's Redux slice, so the next city
// opens on it too; each screen's `v` param mirrors it like the web's `?v=`, so a deep link opens on its variable.
export const getSelectedVariableState = () => state

export const setSelectedVariable = (variable: Variable) => {
    if (variable === state.variable) return

    state = { variable, version: state.version + 1 }
    listeners.forEach((listener) => listener())
}

export const subscribeSelectedVariable = (onChange: () => void) => {
    listeners.add(onChange)

    return () => void listeners.delete(onChange)
}

export const parseVariable = (raw: string | string[] | undefined): Variable | null =>
    typeof raw === 'string' && VARIABLE_IDS.has(raw) ? (raw as Variable) : null

// A screen opens on its own `v` param, then on the session's choice, then on temperature. Once the variable changes
// anywhere after the screen opened, the session's choice wins.
export const resolveVariable = (entry: SelectedVariableState, current: SelectedVariableState): Variable =>
    (entry.version === current.version ? entry.variable : null) ?? current.variable ?? Variable.Temp
