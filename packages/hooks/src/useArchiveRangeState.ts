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
import { useMemo, useState } from 'react'
import {
    RangeCalendarState,
    RangeCalendarStateOptions,
    useRangeCalendarState,
} from 'react-stately/useRangeCalendarState'
import {
    ARCHIVE_FIRST_DAY_OF_WEEK,
    CalendarRange,
    DAYS_IN_WEEK,
    getYears,
    isCityToday,
    isOutsideArchiveSpan,
    moveToYear,
    padWeeks,
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
    // Always `CALENDAR_WEEKS` rows, the missing ones empty.
    weeks: (CalendarDate | null)[][]
    // The year list the title opens instead of the days, from 1940 to this year.
    years: number[]
    shownYear: number
    isChoosingYear: boolean
    toggleYears: () => void
    // Shows the days of the shown month in that year.
    selectYear: (year: number) => void
    getDayState: (date: CalendarDate) => ArchiveDayState
    getDayLabel: (date: CalendarDate) => string
}

const FIRST_DATE = parseDate(ARCHIVE_FIRST_DATE)

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
    padWeeks(Array.from({ length: state.getWeeksInMonth() }, (_, i) => state.getDatesInWeek(i)))

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

export function useArchiveRangeState({
    range,
    latest,
    locale,
    onChange,
    autoFocus,
}: ArchiveRangeStateOptions): UseArchiveRangeStateResult {
    const { from, to } = range
    const [isChoosingYear, setIsChoosingYear] = useState(false)

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
    const years = useMemo(() => getYears(FIRST_DATE, maxValue), [maxValue])

    const selectYear = (year: number) => {
        state.setFocusedDate(moveToYear(state.focusedDate, year, maxValue))
        setIsChoosingYear(false)
    }

    return {
        state,
        options,
        title,
        weekDays,
        weeks,
        years,
        shownYear: state.visibleRange.start.year,
        isChoosingYear,
        toggleYears: () => setIsChoosingYear((is) => !is),
        selectYear,
        getDayState: (date) => getDayState(state, date, latest),
        getDayLabel: (date) => formatters.day.format(date.toDate(state.timeZone)),
    }
}
