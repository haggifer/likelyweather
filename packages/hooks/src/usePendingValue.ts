import { startTransition, useEffect, useRef, useState } from 'react'

export interface UsePendingValueResult<T> {
    // The value to show: a pick at once, before it is handed on.
    value: T
    setValue: (next: T) => void
}

// A control that shows a pick at once and hands it on (`onChange`) only once the screen has painted it and `delayMs`
// more have passed, as a transition: the tap's own feedback (a tab turning on, its width animation) runs smoothly,
// and the heavy work the pick sets off, such as redrawing a chart, starts after it. It waits two frames because a
// frame's callback runs before that frame is painted.
export function usePendingValue<T>(value: T, onChange: (next: T) => void, delayMs = 0): UsePendingValueResult<T> {
    const [pending, setPending] = useState<{ value: T } | null>(null)
    // The scheduled hand-over, cancelled by a newer pick or an unmount.
    const cancelRef = useRef<(() => void) | null>(null)

    const isHandedOn = pending !== null && Object.is(pending.value, value)

    if (isHandedOn) setPending(null)

    const setValue = (next: T) => {
        cancelRef.current?.()
        setPending({ value: next })

        let timer: ReturnType<typeof setTimeout> | undefined
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                timer = setTimeout(() => startTransition(() => onChange(next)), delayMs)
            })
        })

        cancelRef.current = () => {
            cancelAnimationFrame(frame)
            clearTimeout(timer)
        }
    }

    useEffect(() => () => cancelRef.current?.(), [])

    return { value: pending && !isHandedOn ? pending.value : value, setValue }
}
