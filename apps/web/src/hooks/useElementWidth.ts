import { RefCallback, useCallback, useState } from 'react'

export interface UseElementWidthResult<T extends HTMLElement> {
    ref: RefCallback<T>
    width: number
}

export function useElementWidth<T extends HTMLElement = HTMLDivElement>(initial = 640): UseElementWidthResult<T> {
    const [width, setWidth] = useState(initial)

    const ref = useCallback<RefCallback<T>>((node) => {
        if (!node) return

        // Rounded down: a width rounded up past a fractional container would make a chart that fits overflow it by
        // a fraction of a pixel, and its scroller would show a scrollbar.
        setWidth(Math.floor(node.getBoundingClientRect().width) || initial)
        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
        observer.observe(node)

        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { ref, width }
}
