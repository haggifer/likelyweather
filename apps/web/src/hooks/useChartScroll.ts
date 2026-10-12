import { getRevealScrollLeft } from '@fa/chart-core/scroll-geometry'
import { RefObject, useCallback, useLayoutEffect, useRef } from 'react'

export interface UseChartScrollResult {
    ref: RefObject<HTMLDivElement | null>
    reveal: (x: number) => void
}

// A chart wider than its container opens at now, and a new `resetKey` (another run, city or chart width) opens it
// there again; anything else, such as another variable, keeps the reader's place.
export function useChartScroll(
    resetKey: string,
    initialScrollLeft: number,
    [insetLeft, insetRight]: [number, number],
): UseChartScrollResult {
    const ref = useRef<HTMLDivElement>(null)

    const reveal = useCallback(
        (x: number) => {
            const node = ref.current

            if (!node) return

            node.scrollLeft = getRevealScrollLeft(x, {
                scrollLeft: node.scrollLeft,
                viewportWidth: node.clientWidth,
                insetLeft,
                insetRight,
            })
        },
        [insetLeft, insetRight],
    )

    useLayoutEffect(() => {
        if (ref.current) ref.current.scrollLeft = initialScrollLeft
        // The offset moves with every tick of `now`; only a new key moves the view.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey])

    return { ref, reveal }
}
