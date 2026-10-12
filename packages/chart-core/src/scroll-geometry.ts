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

// "100" in Inter SemiBold, the charts' font in both apps, measured in the browser (17.4 px at 10 px). A ratio instead
// of a runtime measurement keeps the server render and the first client render the same width.
const DIGITS_EM = 1.75
const LABEL_PADDING = 4

// The narrowest 3-hour slot: room for a three-digit label such as a 100 % chance of rain.
export const getMinSlotWidth = (fontSize: number) => Math.ceil(fontSize * DIGITS_EM + LABEL_PADDING)

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
