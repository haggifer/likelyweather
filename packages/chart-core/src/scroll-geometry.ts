import { clamp } from './plot-geometry'

interface ScrollInput {
    slotWidth: number
    insetLeft: number
    contentWidth: number
    viewportWidth: number
}

interface RevealInput {
    scrollLeft: number
    viewportWidth: number
    insetLeft: number
    insetRight: number
}

// The narrowest 3-hour slot (author, 2026-10-12): room for a three-digit label at the charts' text size, such as a
// 100 % chance of rain, with air around it.
export const MIN_SLOT_WIDTH = 30
// The archive draws every hour, each at least this wide (author, 2026-10-13); it has no chance-of-rain labels to fit.
export const MIN_ARCHIVE_HOUR_WIDTH = 20

// A chart fills its container, or grows past it and scrolls when its slots would get narrower than `minSlot`.
export const getScrollWidth = (available: number, intervals: number, minSlot: number, sides: number) =>
    Math.max(available, sides + intervals * minSlot)

// Opens with the now line one slot inside the visible plot, so the coming hours fill the view.
export const getInitialScrollLeft = (
    nowX: number | null,
    { slotWidth, insetLeft, contentWidth, viewportWidth }: ScrollInput,
) => (nowX === null ? 0 : clamp(nowX - insetLeft - slotWidth, 0, Math.max(0, contentWidth - viewportWidth)))

// The scroll offset that keeps `x` between the pinned axis and the right margin.
export const getRevealScrollLeft = (x: number, { scrollLeft, viewportWidth, insetLeft, insetRight }: RevealInput) => {
    if (x < scrollLeft + insetLeft) return x - insetLeft

    if (x > scrollLeft + viewportWidth - insetRight) return x - viewportWidth + insetRight

    return scrollLeft
}

// The part of a scrolled chart's plot that is on screen, in the chart's own coordinates: between the pinned axis
// column and the right margin. Hover labels clamp to it, so none slides under the axis or past the visible edge.
export const getVisibleRange = (
    scrollLeft: number,
    viewportWidth: number,
    [insetLeft, insetRight]: [number, number],
): [number, number] => [scrollLeft + insetLeft, scrollLeft + viewportWidth - insetRight]
