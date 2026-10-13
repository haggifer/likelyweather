import { ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { CalendarDate, DateValue, DayOfWeek, parseDate, toCalendarDate } from '@internationalized/date'

// The archive period as the calendar holds it: whole days, both ends included.
export interface CalendarRange {
    start: CalendarDate
    end: CalendarDate
}

// Weeks start on Monday in Ukrainian, Spanish, German and French. English follows them rather than the US Sunday: the
// app has no week-start setting, and its places, like the DD.MM.YYYY period, are mostly European.
export const ARCHIVE_FIRST_DAY_OF_WEEK: DayOfWeek = 'mon'

export const toCalendarRange = ({ from, to }: ArchiveRange): CalendarRange => ({
    start: parseDate(from),
    end: parseDate(to),
})

export const toArchiveRange = ({ start, end }: CalendarRange): ArchiveRange => ({
    from: start.toString(),
    to: end.toString(),
})

// The first tap starts the period; the second ends it on that day or one of the 11 after it, so a period never runs
// past 12 days (`ARCHIVE_MAX_DAYS`). Before the first tap every day from 1940 to yesterday is open.
export const isOutsideArchiveSpan = (date: DateValue, anchor: CalendarDate | null) => {
    if (!anchor) return false

    const days = toCalendarDate(date).compare(anchor)

    return days < 0 || days > ARCHIVE_MAX_DAYS - 1
}
