import { RefObject, useCallback, useSyncExternalStore } from 'react'

const getServerSnapshot = () => 0

// Only the component that reads the offset re-renders as its scroller moves, not the chart around it.
export function useScrollLeft(ref: RefObject<HTMLElement | null>): number {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const node = ref.current

            node?.addEventListener('scroll', onChange, { passive: true })

            return () => node?.removeEventListener('scroll', onChange)
        },
        [ref],
    )
    const getSnapshot = useCallback(() => ref.current?.scrollLeft ?? 0, [ref])

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
