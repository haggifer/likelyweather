import { CompareResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'

// The previous query of a placeholder; forecast keys end with the variable: ['latest', slug, variable] and
// ['compare', slugs, variable].
type PreviousQuery = { queryKey: readonly unknown[] } | undefined

// While a new key loads, the previous answer stays on screen, dimmed. Only an answer about the same variable may stand
// in: the series carry no variable, so another variable's numbers would show under the new one's unit.
const isSameVariable = (query: PreviousQuery, variable: Variable) => query?.queryKey[2] === variable

export const keepSameVariable =
    <T>(variable: Variable) =>
    (previous: T | undefined, query: PreviousQuery) =>
        isSameVariable(query, variable) ? previous : undefined

// A city removed from the comparison leaves the placeholder at once, so its values never widen the shared axis.
export const keepCompareCities =
    (slugs: string[], variable: Variable) => (previous: CompareResponse | undefined, query: PreviousQuery) =>
        previous && isSameVariable(query, variable)
            ? { ...previous, items: previous.items.filter((item) => slugs.includes(item.city.slug)) }
            : undefined
