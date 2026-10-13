import { ArchiveDayState, useArchiveRangeState } from '@fa/hooks/useArchiveRangeState'
import { ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { CalendarDate } from '@internationalized/date'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LucideIcon } from 'lucide-react-native'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

// The web's day cells (ArchiveRangeCalendar there): the selected days join into one bar, the ends filled with the
// primary colour and the days between them muted.
const getDayClassName = ({ isSelected, isRangeStart, isRangeEnd }: ArchiveDayState) =>
    cn(
        'size-9 rounded-md',
        isSelected && 'rounded-none bg-muted',
        isRangeStart && 'rounded-l-lg',
        isRangeEnd && 'rounded-r-lg',
        (isRangeStart || isRangeEnd) && 'bg-primary active:bg-primary/80',
    )

const getDayTextClassName = ({ isSelected, isRangeStart, isRangeEnd, isToday }: ArchiveDayState) =>
    cn(
        'font-normal tabular-nums',
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
    <Button variant="ghost" size="icon" accessibilityLabel={label} disabled={isDisabled} onPress={onPress}>
        <Icon as={icon} className="size-4" />
    </Button>
)

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The archive period's month grid (`useArchiveRangeState`), drawn like the web's: a tap starts the period and a second
// one ends it. TalkBack reads each day's full date and whether it is selected or unavailable.
export function ArchiveRangeCalendar({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()

    const { state, title, weekDays, weeks, getDayState, getDayLabel } = useArchiveRangeState({
        range,
        latest,
        locale,
        onChange,
    })

    // A year step stops at 1940-01-01 or at yesterday, so it is offered as long as a month step is.
    const isPreviousInvalid = state.isPreviousVisibleRangeInvalid()
    const isNextInvalid = state.isNextVisibleRangeInvalid()

    // A press moves the calendar's focus too, as a click does on the web, so the half-picked period is that one day.
    const handleDay = (date: CalendarDate) => {
        state.setFocusedDate(date)
        state.selectDate(date)
    }
    const renderDay = (date: CalendarDate | null, key: number) => {
        const day = date && getDayState(date)

        if (!date || !day || day.isOutsideMonth) return <View key={key} className="size-9" />

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
                        isDisabled={isPreviousInvalid}
                        onPress={() => state.focusPreviousSection(true)}
                    />
                    <PageButton
                        label={t('previousMonth')}
                        icon={ChevronLeft}
                        isDisabled={isPreviousInvalid}
                        onPress={() => state.focusPreviousPage()}
                    />
                </View>
                <Text
                    className="flex-1 text-center text-sm leading-4 font-medium"
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                >
                    {title}
                </Text>
                <View className="flex-row">
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
                </View>
            </View>
            <View>
                <View className="flex-row justify-center" importantForAccessibility="no-hide-descendants">
                    {weekDays.map((weekDay, i) => (
                        <Text key={i} className="w-9 pb-1 text-center text-xs text-muted-foreground">
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
            <Text className="text-xs text-muted-foreground">{t('limit', { days: ARCHIVE_MAX_DAYS })}</Text>
        </View>
    )
}
