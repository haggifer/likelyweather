import { getForecastAge, getForecastTitleValues } from '@fa/shared/forecast-age'
import { ClockAlert } from 'lucide-react-native'
import { useLocale, useTranslations } from 'use-intl'
import { Hint } from '../shell/Hint'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

interface IProps {
    fetchedAt: string
    now: Date
    // With the run's start time and the city's zone, a tap on the chip shows the run's times, the web's tooltip.
    issueTime?: string
    timeZone?: string
    // The overview card's row has room for icons only (author, 2026-10-13): a warning clock whose snackbar tells only
    // its age (author, 2026-10-14).
    isCompact?: boolean
}

// How old the data on screen is, shown once Refresh turns on; amber once it is past the stale mark.
export function UpdatedChip({ fetchedAt, now, issueTime, timeZone, isCompact = false }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const { hours, isShown, isStale, tone } = getForecastAge(fetchedAt, now)
    const label = t('forecastAge', { hours })
    const badge = (
        <Badge variant={tone} className="h-7">
            <Text className="text-sm">{label}</Text>
        </Badge>
    )

    if (!isShown) return null

    if (isCompact) {
        return (
            // The compact clock takes the web's phone box; its hint tells only the age (author, 2026-10-14).
            <Hint content={label}>
                <Button
                    variant="ghost"
                    size="icon"
                    hitSlop={8}
                    accessibilityLabel={label}
                    className="size-9 rounded-full"
                >
                    <Icon as={ClockAlert} className="size-4 text-warning" />
                </Button>
            </Hint>
        )
    }

    if (!issueTime || !timeZone) return badge

    const runTimes = t('forecastTitle', getForecastTitleValues(issueTime, fetchedAt, timeZone, locale))
    const details = isStale ? `${runTimes} ${t('forecastOldTitle')}` : runTimes

    return (
        <Hint content={details}>
            <Button
                variant="ghost"
                hitSlop={8}
                accessibilityLabel={label}
                accessibilityHint={details}
                className="h-auto rounded-full px-0"
            >
                {badge}
            </Button>
        </Hint>
    )
}
