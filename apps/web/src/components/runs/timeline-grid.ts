import { DAY_MS, HOUR_MS } from '@fa/shared/constants'
import { formatTime } from '@fa/shared/format'
import { getLocalDateKey, toIsoMinute } from '@fa/shared/time'

interface TimelineRow {
    cycleHour: number
    label: string
}

export interface TimelineGrid {
    days: string[]
    rows: TimelineRow[]
    cells: Map<string, string>
}

const CYCLE_HOURS = [0, 6, 12, 18]
const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

export const toCellKey = (day: string, cycleHour: number) => `${day}|${cycleHour}`

const getUtcMidnight = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

const getTimelineRows = (now: Date, timeZone: string, locale: string): TimelineRow[] => {
    const today = getUtcMidnight(now)

    return CYCLE_HOURS.map((cycleHour) => ({
        cycleHour,
        label: formatTime(new Date(today + cycleHour * HOUR_MS), timeZone, locale, CLOCK),
    })).sort((a, b) => a.label.localeCompare(b.label))
}

// Model runs start at 00, 06, 12 and 18 UTC. The grid puts them on the viewer's calendar: a column per local day and
// a row per run in local clock order, so a run that starts after local midnight sits in the next day's column. Row
// labels use today's offset; after a daylight-saving change, older cells sit an hour off their label, and their
// tooltips give the exact time.
export const buildTimelineGrid = (
    from: string,
    to: string,
    now: Date,
    timeZone: string,
    locale: string,
): TimelineGrid => {
    const firstDay = getUtcMidnight(new Date(from))
    const dayCount = Math.ceil((new Date(to).getTime() - firstDay) / DAY_MS)
    const cells = new Map<string, string>()
    const days = new Set<string>()

    for (let i = 0; i < dayCount; i++) {
        for (const cycleHour of CYCLE_HOURS) {
            const issueTime = toIsoMinute(new Date(firstDay + i * DAY_MS + cycleHour * HOUR_MS))
            const day = getLocalDateKey(issueTime, timeZone)

            days.add(day)
            cells.set(toCellKey(day, cycleHour), issueTime)
        }
    }

    const rows = getTimelineRows(now, timeZone, locale)

    return { days: [...days].sort(), rows, cells }
}
