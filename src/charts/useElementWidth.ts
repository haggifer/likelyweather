import { RefCallback, useCallback, useState } from 'react'

export interface UseElementWidthResult<T extends HTMLElement> {
    ref: RefCallback<T>
    width: number
}

export default function useElementWidth<T extends HTMLElement = HTMLDivElement>(
    initial = 640,
): UseElementWidthResult<T> {
    const [width, setWidth] = useState(initial)

    const ref = useCallback<RefCallback<T>>((node) => {
        if (!node) return

        setWidth(node.getBoundingClientRect().width || initial)
        const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
        observer.observe(node)

        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { ref, width }
}
