import { formatDayLabel, formatSlotTime } from '@fa/shared/format'
import { getLocalDateKey } from '@fa/shared/time'

// The local days of a table whose columns are time slots: each day's header cell spans its slots.
export interface TimeTableDay {
    key: string
    // The first slot's column and the number of slots, which the day's header cell spans.
    start: number
    count: number
    label: string
}

export const getTimeTableDays = (steps: string[], timeZone: string, locale: string): TimeTableDay[] =>
    steps.reduce<TimeTableDay[]>((days, step, i) => {
        const key = getLocalDateKey(step, timeZone)
        const last = days[days.length - 1]

        if (last?.key === key) {
            last.count += 1

            return days
        }

        return [...days, { key, start: i, count: 1, label: formatDayLabel(step, timeZone, locale) }]
    }, [])

export const getTimeTableSlotLabels = (steps: string[], timeZone: string, locale: string) =>
    steps.map((step) => formatSlotTime(step, timeZone, locale))

// The app's `position: sticky; left: 0` for a date inside its day's cell, as the web draws it: from the cell's start
// the date rides the visible left edge while the cell scrolls past, until the cell's end pushes it out. The app runs it
// on the UI thread for every scroll frame, hence the worklet.
export const getStickyLabelOffset = (
    [spanStart, spanEnd]: [number, number],
    labelWidth: number,
    visibleStart: number,
) => {
    'worklet'
    return Math.max(0, Math.min(visibleStart - spanStart, spanEnd - spanStart - labelWidth))
}
