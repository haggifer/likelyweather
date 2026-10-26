import { formatDayLabel, formatNumericDay, formatSlotTime } from '@fa/shared/format'
import { getLocalDateKey } from '@fa/shared/time'

// The local days of a table whose columns are time slots: each day's header cell spans its slots.
export interface TimeTableDay {
    key: string
    // The first slot's column and the number of slots, which the day's header cell spans.
    start: number
    count: number
    label: string
    shortLabel: string
}

export type DayLabelForm = 'full' | 'short' | 'none'

export interface DayLabelPlacement {
    form: DayLabelForm
    // The label's centre, in the same coordinates as the span and the visible range.
    center: number
}

// The room a date label keeps from the visible edges of its cell.
export const DAY_LABEL_PADDING = 8

export const getTimeTableDays = (steps: string[], timeZone: string, locale: string): TimeTableDay[] =>
    steps.reduce<TimeTableDay[]>((days, step, i) => {
        const key = getLocalDateKey(step, timeZone)
        const last = days[days.length - 1]

        if (last?.key === key) {
            last.count += 1

            return days
        }

        const label = formatDayLabel(step, timeZone, locale)
        const shortLabel = formatNumericDay(step, timeZone, locale)

        return [...days, { key, start: i, count: 1, label, shortLabel }]
    }, [])

export const getTimeTableSlotLabels = (steps: string[], timeZone: string, locale: string) =>
    steps.map((step) => formatSlotTime(step, timeZone, locale))

// A day's date stays on screen while any of its columns do: centred on the visible part of its cell, in full when it
// fits there, in digits when only they fit, and not at all when even they don't. The app calls it on the UI thread
// for every scroll frame, hence the worklet.
export const placeDayLabel = (
    [spanStart, spanEnd]: [number, number],
    [visibleStart, visibleEnd]: [number, number],
    fullWidth: number,
    shortWidth: number,
): DayLabelPlacement => {
    'worklet'
    const left = Math.max(spanStart, visibleStart)
    const right = Math.min(spanEnd, visibleEnd)
    const room = right - left - 2 * DAY_LABEL_PADDING
    const center = (left + right) / 2

    if (fullWidth <= room) return { form: 'full', center }

    return { form: shortWidth <= room ? 'short' : 'none', center }
}
