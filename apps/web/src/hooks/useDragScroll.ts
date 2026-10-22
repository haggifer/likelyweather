import { MouseEvent, PointerEvent, useRef } from 'react'

export interface UseDragScrollResult {
    onPointerDownCapture: (e: PointerEvent<HTMLDivElement>) => void
    onPointerMoveCapture: (e: PointerEvent<HTMLDivElement>) => void
    onPointerUpCapture: () => void
    onLostPointerCapture: () => void
    onClickCapture: (e: MouseEvent<HTMLDivElement>) => void
}

interface DragStart {
    clientX: number
    scrollLeft: number
    isDragging: boolean
}

// A press becomes a drag once the mouse has moved this far, so a click with a slight shake still picks a slot.
const DRAG_THRESHOLD_PX = 4

const isOnScrollbar = (e: PointerEvent<HTMLDivElement>) =>
    e.clientY - e.currentTarget.getBoundingClientRect().top >= e.currentTarget.clientHeight

// A mouse drags a scrolling chart sideways from anywhere on it, as a finger does; CSS has no drag-to-scroll. The
// handlers run in the capture phase because the plot stops its own `pointerdown` from bubbling. Once a press becomes a
// drag the scroller captures the pointer, so the plot loses its hover, and the click that ends the drag is swallowed
// so it picks no slot.
export function useDragScroll(): UseDragScrollResult {
    const startRef = useRef<DragStart | null>(null)
    const isClickSwallowedRef = useRef(false)

    const onPointerDownCapture = (e: PointerEvent<HTMLDivElement>) => {
        isClickSwallowedRef.current = false

        if (e.pointerType !== 'mouse' || e.button !== 0 || isOnScrollbar(e)) return

        startRef.current = { clientX: e.clientX, scrollLeft: e.currentTarget.scrollLeft, isDragging: false }
    }

    const onPointerMoveCapture = (e: PointerEvent<HTMLDivElement>) => {
        const start = startRef.current

        if (!start) return

        // The button went up outside the chart, where the scroller never heard it.
        if (e.buttons % 2 === 0) {
            startRef.current = null

            return
        }

        const distance = e.clientX - start.clientX

        if (!start.isDragging && Math.abs(distance) < DRAG_THRESHOLD_PX) return

        if (!start.isDragging) {
            start.isDragging = true
            e.currentTarget.setPointerCapture(e.pointerId)
        }

        e.currentTarget.scrollLeft = start.scrollLeft - distance
    }

    const onPointerUpCapture = () => {
        isClickSwallowedRef.current = startRef.current?.isDragging ?? false
        startRef.current = null
    }

    const onLostPointerCapture = () => {
        startRef.current = null
    }

    const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
        if (!isClickSwallowedRef.current) return

        isClickSwallowedRef.current = false
        e.stopPropagation()
    }

    return { onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture, onLostPointerCapture, onClickCapture }
}
