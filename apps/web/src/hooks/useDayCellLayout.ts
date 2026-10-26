import { TimeTableDay } from '@fa/chart-core/time-table'
import { RefObject, useEffect, useState } from 'react'

// In px from the table's left edge, the coordinates `offsetLeft` gives the day cells.
export interface DayCellLayout {
    spans: [number, number][]
    // Where the pinned label column ends, which is where the first day's cell starts.
    pinnedEnd: number
    viewportWidth: number
}

const measureDayCells = (scroller: HTMLElement, row: HTMLElement): DayCellLayout => {
    const cells = [...row.querySelectorAll<HTMLElement>('[data-day]')]

    return {
        spans: cells.map((cell) => [cell.offsetLeft, cell.offsetLeft + cell.offsetWidth]),
        pinnedEnd: cells[0]?.offsetLeft ?? 0,
        viewportWidth: scroller.clientWidth,
    }
}

// Null until the cells are laid out. `days` changes only with the table's slots, which can move a day's edges without
// resizing anything the observer watches.
export function useDayCellLayout(
    scrollerRef: RefObject<HTMLElement | null>,
    rowRef: RefObject<HTMLElement | null>,
    days: TimeTableDay[],
): DayCellLayout | null {
    const [layout, setLayout] = useState<DayCellLayout | null>(null)

    useEffect(() => {
        const scroller = scrollerRef.current
        const row = rowRef.current

        if (!scroller || !row) return

        const measure = () => setLayout(measureDayCells(scroller, row))
        const observer = new ResizeObserver(measure)
        measure()
        observer.observe(scroller)
        observer.observe(row)

        return () => observer.disconnect()
    }, [scrollerRef, rowRef, days])

    return layout
}
