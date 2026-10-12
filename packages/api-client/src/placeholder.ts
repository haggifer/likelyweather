import { Variable } from '@fa/shared/variables'

// The previous query of a placeholder; forecast keys end with the variable: ['latest', slug, variable].
type PreviousQuery = { queryKey: readonly unknown[] } | undefined

// While a new key loads, the previous answer stays on screen, dimmed. Only an answer about the same variable may stand
// in: the series carry no variable, so another variable's numbers would show under the new one's unit.
const isSameVariable = (query: PreviousQuery, variable: Variable) => query?.queryKey[2] === variable

export const keepSameVariable =
    <T>(variable: Variable) =>
    (previous: T | undefined, query: PreviousQuery) =>
        isSameVariable(query, variable) ? previous : undefined
