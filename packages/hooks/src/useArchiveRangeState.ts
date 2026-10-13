import { ARCHIVE_FIRST_DATE, ArchiveRange } from '@fa/shared/archive'
import {
    CalendarDate,
    DateFormatter,
    GregorianCalendar,
    isSameDay,
    isSameMonth,
    parseDate,
    startOfWeek,
} from '@internationalized/date'
import { useMemo } from 'react'
import {
    RangeCalendarState,
    RangeCalendarStateOptions,
    useRangeCalendarState,
} from 'react-stately/useRangeCalendarState'
import {
    ARCHIVE_FIRST_DAY_OF_WEEK,
    CalendarRange,
    isCityToday,
    isOutsideArchiveSpan,
    toArchiveRange,
    toCalendarRange,
} from './archive-calendar'

interface ArchiveRangeStateOptions {
    range: ArchiveRange
    // The last day the archive has, yesterday in the city (`getLatestArchiveDate`).
    latest: string
    locale: string
    onChange: (range: ArchiveRange) => void
    // The web moves keyboard focus to the period's day when the calendar opens; the app has no keyboard focus to move.
    autoFocus?: boolean
}

export interface ArchiveDayState {
    isSelected: boolean
    isRangeStart: boolean
    isRangeEnd: boolean
    isDisabled: boolean
    isOutsideMonth: boolean
    isToday: boolean
}

export interface UseArchiveRangeStateResult {
    state: RangeCalendarState<CalendarDate>
    // The options the state was built from, which the web's `useRangeCalendar` needs as well.
    options: RangeCalendarStateOptions<CalendarDate>
    title: string
    weekDays: string[]
    weeks: (CalendarDate | null)[][]
    getDayState: (date: CalendarDate) => ArchiveDayState
    getDayLabel: (date: CalendarDate) => string
}

const FIRST_DATE = parseDate(ARCHIVE_FIRST_DATE)
const DAYS_IN_WEEK = 7

// Only the Gregorian calendar, so the bundle carries none of the others.
const createCalendar = () => new GregorianCalendar()

const createFormatters = (locale: string, timeZone: string) => ({
    title: new DateFormatter(locale, { month: 'long', year: 'numeric', timeZone }),
    weekDay: new DateFormatter(locale, { weekday: 'short', timeZone }),
    day: new DateFormatter(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone }),
})

// Some languages write month names in lower case ("жовтень 2026 р."); a title starts with a capital in all of them.
const toTitle = (text: string, locale: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)

const getWeekDays = (state: RangeCalendarState, locale: string, formatter: DateFormatter) => {
    const monday = startOfWeek(state.visibleRange.start, locale, ARCHIVE_FIRST_DAY_OF_WEEK)

    return Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
        formatter.format(monday.add({ days: i }).toDate(state.timeZone)),
    )
}

const getWeeks = (state: RangeCalendarState) =>
    Array.from({ length: state.getWeeksInMonth() }, (_, i) => state.getDatesInWeek(i))

const getDayState = (state: RangeCalendarState, date: CalendarDate, latest: string): ArchiveDayState => {
    const range = state.highlightedRange

    return {
        isSelected: state.isSelected(date),
        isRangeStart: Boolean(range && isSameDay(date, range.start)),
        isRangeEnd: Boolean(range && isSameDay(date, range.end)),
        isDisabled: state.isCellDisabled(date) || state.isCellUnavailable(date),
        isOutsideMonth: !isSameMonth(date, state.visibleRange.start),
        isToday: isCityToday(date, latest),
    }
}

// The archive period's range calendar, shared by both apps, which only draw it: one month at a time from 1940 to
// yesterday in the city, the first tap starting the period and the second ending it within 12 days, which applies it.
export function useArchiveRangeState({
    range,
    latest,
    locale,
    onChange,
    autoFocus,
}: ArchiveRangeStateOptions): UseArchiveRangeStateResult {
    const { from, to } = range
    const value = useMemo(() => toCalendarRange({ from, to }), [from, to])
    const maxValue = useMemo(() => parseDate(latest), [latest])

    const handleChange = (next: CalendarRange) => onChange(toArchiveRange(next))

    const options: RangeCalendarStateOptions<CalendarDate> = {
        locale,
        createCalendar,
        value,
        minValue: FIRST_DATE,
        maxValue,
        firstDayOfWeek: ARCHIVE_FIRST_DAY_OF_WEEK,
        isDateUnavailable: isOutsideArchiveSpan,
        onChange: handleChange,
        autoFocus,
    }
    const state = useRangeCalendarState(options)

    const formatters = useMemo(() => createFormatters(locale, state.timeZone), [locale, state.timeZone])
    const title = toTitle(formatters.title.format(state.visibleRange.start.toDate(state.timeZone)), locale)
    const weekDays = getWeekDays(state, locale, formatters.weekDay)
    const weeks = getWeeks(state)

    return {
        state,
        options,
        title,
        weekDays,
        weeks,
        getDayState: (date) => getDayState(state, date, latest),
        getDayLabel: (date) => formatters.day.format(date.toDate(state.timeZone)),
    }
}
