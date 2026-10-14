import { useState } from 'react'

// The first value that is not null, kept for good: a view that must not move with the clock reads its date once. The
// web's clock is null until it hydrates, so the first value can arrive after the first render.
export function useFirstValue<T>(value: T): T {
    const [first, setFirst] = useState(value)

    if (first === null && value !== null) setFirst(value)

    return first ?? value
}
