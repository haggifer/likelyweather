import { ArchiveDayState, useArchiveRangeState } from '@fa/hooks/useArchiveRangeState'
import { ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { CalendarDate } from '@internationalized/date'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LucideIcon } from 'lucide-react-native'
import { useRef } from 'react'
import { LayoutChangeEvent, ScrollView, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

// The web's day cells (ArchiveRangeCalendar there).
const getDayClassName = ({ isSelected, isRangeStart, isRangeEnd, isDisabled }: ArchiveDayState) =>
    cn(
        'size-10',
        isSelected && 'rounded-none bg-muted',
        isRangeStart && 'rounded-l-lg',
        isRangeEnd && 'rounded-r-lg',
        (isRangeStart || isRangeEnd) && 'bg-primary',
        isDisabled && 'opacity-40',
    )

const getDayTextClassName = ({ isSelected, isRangeStart, isRangeEnd, isToday }: ArchiveDayState) =>
    cn(
        'font-normal',
        isToday && !isSelected && 'font-semibold text-primary',
        (isRangeStart || isRangeEnd) && 'text-primary-foreground',
    )

interface PageButtonProps {
    label: string
    icon: LucideIcon
    isDisabled: boolean
    onPress: () => void
}

const PageButton = ({ label, icon, isDisabled, onPress }: PageButtonProps) => (
    <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={label}
        disabled={isDisabled}
        onPress={onPress}
        className="size-10"
    >
        <Icon as={icon} />
    </Button>
)

interface YearListProps {
    years: number[]
    shownYear: number
    label: string
    onSelect: (year: number) => void
}

// One row of the year list: its buttons are `h-10`.
const YEAR_ROW_HEIGHT = 40
const YEARS_PER_ROW = 4

// Laid over the day grid, which keeps its place, so the calendar's size doesn't change, as on the web. It opens with
// the shown year in the middle; a scroll view can only be moved once it has a height.
const YearList = ({ years, shownYear, label, onSelect }: YearListProps) => {
    const scrollRef = useRef<ScrollView>(null)

    const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
        const row = Math.floor(years.indexOf(shownYear) / YEARS_PER_ROW)
        const y = row * YEAR_ROW_HEIGHT - (nativeEvent.layout.height - YEAR_ROW_HEIGHT) / 2

        scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false })
    }

    return (
        <ScrollView
            ref={scrollRef}
            onLayout={handleLayout}
            accessibilityLabel={label}
            className="absolute inset-0"
            contentContainerClassName="flex-row flex-wrap"
        >
            {years.map((year) => {
                const isShown = year === shownYear

                return (
                    <Button
                        key={year}
                        variant={isShown ? 'default' : 'ghost'}
                        accessibilityState={{ selected: isShown }}
                        onPress={() => onSelect(year)}
                        className="h-10 w-1/4"
                    >
                        <Text className="font-normal">{year}</Text>
                    </Button>
                )
            })}
        </ScrollView>
    )
}

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

export function ArchiveRangeCalendar({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()

    const {
        state,
        title,
        weekDays,
        weeks,
        years,
        shownYear,
        isChoosingYear,
        toggleYears,
        selectYear,
        getDayState,
        getDayLabel,
    } = useArchiveRangeState({ range, latest, locale, onChange })

    // A year step stops at 1940-01-01 or at yesterday, so it is offered as long as a month step is. The year list
    // keeps the arrows in place but off.
    const isPreviousOff = isChoosingYear || state.isPreviousVisibleRangeInvalid()
    const isNextOff = isChoosingYear || state.isNextVisibleRangeInvalid()

    // A press moves the calendar's focus too, as a click does on the web, so the half-picked period is that one day.
    const handleDay = (date: CalendarDate) => {
        state.setFocusedDate(date)
        state.selectDate(date)
    }
    const renderDay = (date: CalendarDate | null, key: number) => {
        const day = date && getDayState(date)

        if (!date || !day || day.isOutsideMonth) return <View key={key} className="size-10" />

        return (
            <Button
                key={key}
                variant="ghost"
                size="icon"
                disabled={day.isDisabled}
                accessibilityRole="button"
                accessibilityLabel={getDayLabel(date)}
                accessibilityState={{ selected: day.isSelected, disabled: day.isDisabled }}
                onPress={() => handleDay(date)}
                className={getDayClassName(day)}
            >
                <Text className={getDayTextClassName(day)}>{date.day}</Text>
            </Button>
        )
    }

    return (
        <View className="gap-2" role="group" accessibilityLabel={t('period')}>
            {/* A long title wraps rather than widening the calendar, so paging never moves the arrows. */}
            <View className="flex-row items-center justify-between gap-1">
                <View className="flex-row">
                    <PageButton
                        label={t('previousYear')}
                        icon={ChevronsLeft}
                        isDisabled={isPreviousOff}
                        onPress={() => state.focusPreviousSection(true)}
                    />
                    <PageButton
                        label={t('previousMonth')}
                        icon={ChevronLeft}
                        isDisabled={isPreviousOff}
                        onPress={() => state.focusPreviousPage()}
                    />
                </View>
                <Button
                    variant="ghost"
                    accessibilityState={{ expanded: isChoosingYear }}
                    accessibilityHint={t('chooseYear')}
                    onPress={toggleYears}
                    className="h-auto min-h-10 flex-1 gap-1 px-1"
                >
                    <Text
                        className="shrink text-center text-sm leading-4 font-medium"
                        accessibilityRole="header"
                        accessibilityLiveRegion="polite"
                    >
                        {title}
                    </Text>
                    <Icon as={ChevronDown} className={cn(isChoosingYear && 'rotate-180')} />
                </Button>
                <View className="flex-row">
                    <PageButton
                        label={t('nextMonth')}
                        icon={ChevronRight}
                        isDisabled={isNextOff}
                        onPress={() => state.focusNextPage()}
                    />
                    <PageButton
                        label={t('nextYear')}
                        icon={ChevronsRight}
                        isDisabled={isNextOff}
                        onPress={() => state.focusNextSection(true)}
                    />
                </View>
            </View>
            <View>
                <View
                    className={cn(isChoosingYear && 'opacity-0')}
                    pointerEvents={isChoosingYear ? 'none' : 'auto'}
                    importantForAccessibility={isChoosingYear ? 'no-hide-descendants' : 'auto'}
                >
                    <View className="flex-row justify-center" importantForAccessibility="no-hide-descendants">
                        {weekDays.map((weekDay, i) => (
                            <Text key={i} className="w-10 pb-1 text-center text-xs text-muted-foreground">
                                {weekDay}
                            </Text>
                        ))}
                    </View>
                    {weeks.map((week, i) => (
                        <View key={i} className="flex-row justify-center">
                            {week.map(renderDay)}
                        </View>
                    ))}
                </View>
                {isChoosingYear && (
                    <YearList years={years} shownYear={shownYear} label={t('chooseYear')} onSelect={selectYear} />
                )}
            </View>
            <Text className="text-sm text-muted-foreground">{t('limit', { days: ARCHIVE_MAX_DAYS })}</Text>
        </View>
    )
}
