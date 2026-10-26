import { Variable } from '@fa/shared/variables'

// Forecast keys end with the variable: ['latest', slug, variable].
type PreviousQuery = { queryKey: readonly unknown[] } | undefined

// Only an answer about the same variable may stand in while a new key loads: the series carry no variable, so another
// variable's numbers would show under the new one's unit.
const isSameVariable = (query: PreviousQuery, variable: Variable) => query?.queryKey[2] === variable

export const keepSameVariable =
    <T>(variable: Variable) =>
    (previous: T | undefined, query: PreviousQuery) =>
        isSameVariable(query, variable) ? previous : undefined
