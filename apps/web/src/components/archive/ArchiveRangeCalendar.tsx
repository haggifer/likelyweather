'use client'

import { Button } from '@/components/ui/button'
import { ARCHIVE_FIRST_DAY_OF_WEEK } from '@fa/hooks/archive-calendar'
import { ArchiveDayState, useArchiveRangeState } from '@fa/hooks/useArchiveRangeState'
import { ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { CalendarDate } from '@internationalized/date'
import { cn } from 'cn'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LucideIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRef } from 'react'
import { useCalendarCell, useCalendarGrid, useRangeCalendar } from 'react-aria/useRangeCalendar'
import type { RangeCalendarState } from 'react-stately/useRangeCalendarState'

interface DayProps {
    state: RangeCalendarState
    date: CalendarDate
    day: ArchiveDayState
}

// The selected days join into one bar: the ends filled with the primary colour, the days between them muted.
const getDayClassName = ({ isSelected, isRangeStart, isRangeEnd, isDisabled, isToday }: ArchiveDayState) =>
    cn(
        'size-9 font-normal tabular-nums pointer-coarse:size-10',
        isToday && !isSelected && 'font-semibold text-primary',
        isSelected && 'rounded-none bg-muted text-foreground hover:bg-muted',
        isRangeStart && 'rounded-l-lg',
        isRangeEnd && 'rounded-r-lg',
        (isRangeStart || isRangeEnd) &&
            'bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground',
        isDisabled && 'pointer-events-none opacity-40',
    )

const ArchiveDay = ({ state, date, day }: DayProps) => {
    const ref = useRef<HTMLButtonElement>(null)

    const { cellProps, buttonProps, formattedDate } = useCalendarCell({ date }, state, ref)

    return (
        <td {...cellProps} className="p-0 text-center">
            <Button
                {...buttonProps}
                ref={ref}
                type="button"
                variant="ghost"
                size="icon"
                hidden={day.isOutsideMonth}
                className={getDayClassName(day)}
            >
                {formattedDate}
            </Button>
        </td>
    )
}

interface PageButtonProps {
    label: string
    icon: LucideIcon
    isDisabled: boolean
    onPress: () => void
}

const PageButton = ({ label, icon: PageIcon, isDisabled, onPress }: PageButtonProps) => (
    <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        disabled={isDisabled}
        onClick={onPress}
        className="pointer-coarse:size-10"
    >
        <PageIcon />
    </Button>
)

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The archive period's month grid (`useArchiveRangeState`), with react-aria's grid semantics and keyboard: arrows move
// between days, Enter or a click starts the period and a second one ends it. Wrapped in react-aria's `I18nProvider`
// by its parent, so the days' spoken names follow the page's language.
export function ArchiveRangeCalendar({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()

    const ref = useRef<HTMLDivElement>(null)

    const { state, options, title, weekDays, weeks, getDayState } = useArchiveRangeState({
        range,
        latest,
        locale,
        onChange,
        autoFocus: true,
    })
    // Leaving the calendar halfway through a period keeps the period it had, instead of applying the half-picked one.
    const { calendarProps } = useRangeCalendar(
        { ...options, 'aria-label': t('period'), commitBehavior: 'reset' },
        state,
        ref,
    )
    const { gridProps, headerProps } = useCalendarGrid({ firstDayOfWeek: ARCHIVE_FIRST_DAY_OF_WEEK }, state)

    // A year step stops at 1940-01-01 or at yesterday, so it is offered as long as a month step is.
    const isPreviousInvalid = state.isPreviousVisibleRangeInvalid()
    const isNextInvalid = state.isNextVisibleRangeInvalid()

    return (
        <div {...calendarProps} ref={ref} className="flex flex-col gap-2">
            {/* The month grid sets the width, so paging never moves the arrows; a long title wraps instead. */}
            <div className="flex w-0 min-w-full items-center justify-between gap-1">
                <div className="flex">
                    <PageButton
                        label={t('previousYear')}
                        icon={ChevronsLeft}
                        isDisabled={isPreviousInvalid}
                        onPress={() => state.focusPreviousSection(true)}
                    />
                    <PageButton
                        label={t('previousMonth')}
                        icon={ChevronLeft}
                        isDisabled={isPreviousInvalid}
                        onPress={() => state.focusPreviousPage()}
                    />
                </div>
                <h2 className="min-w-0 flex-1 text-center text-sm leading-4 font-medium text-balance">{title}</h2>
                <div className="flex">
                    <PageButton
                        label={t('nextMonth')}
                        icon={ChevronRight}
                        isDisabled={isNextInvalid}
                        onPress={() => state.focusNextPage()}
                    />
                    <PageButton
                        label={t('nextYear')}
                        icon={ChevronsRight}
                        isDisabled={isNextInvalid}
                        onPress={() => state.focusNextSection(true)}
                    />
                </div>
            </div>
            <table {...gridProps} className="border-collapse">
                <thead {...headerProps}>
                    <tr>
                        {weekDays.map((weekDay, i) => (
                            <th key={i} className="pb-1 text-xs font-normal text-muted-foreground">
                                {weekDay}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, i) => (
                        <tr key={i}>
                            {week.map((date, j) =>
                                date ? (
                                    <ArchiveDay key={j} state={state} date={date} day={getDayState(date)} />
                                ) : (
                                    <td key={j} />
                                ),
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="max-w-72 text-xs text-muted-foreground">{t('limit', { days: ARCHIVE_MAX_DAYS })}</p>
        </div>
    )
}
