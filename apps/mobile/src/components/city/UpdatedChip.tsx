import { getForecastAge, getForecastTitleValues } from '@fa/shared/forecast-age'
import { ClockAlert } from 'lucide-react-native'
import { useLocale, useTranslations } from 'use-intl'
import { showSnackbar } from '../../lib/snackbar-store'
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
    // The overview card's row has room for icons only (author, 2026-10-13): a warning clock, its age in the snackbar.
    isCompact?: boolean
}

// How old the data on screen is, shown once Refresh turns on; amber once it is past the stale mark.
export function UpdatedChip({ fetchedAt, now, issueTime, timeZone, isCompact = false }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const { hours, isShown, isStale, tone } = getForecastAge(fetchedAt, now)
    const label = t('forecastAge', { hours })
    const chip = isCompact ? (
        <Icon as={ClockAlert} className="text-warning" />
    ) : (
        <Badge variant={tone}>
            <Text className="tabular-nums">{label}</Text>
        </Badge>
    )

    if (!isShown) return null

    if (!issueTime || !timeZone) return chip

    const runTimes = t('forecastTitle', getForecastTitleValues(issueTime, fetchedAt, timeZone, locale))
    const details = isStale ? `${runTimes} ${t('forecastOldTitle')}` : runTimes

    return (
        <Button
            variant="ghost"
            // The compact clock takes the web's phone box; the chip keeps its pill's own size.
            size={isCompact ? 'icon-sm' : 'default'}
            onPress={() => showSnackbar(isCompact ? `${label}. ${details}` : details)}
            hitSlop={8}
            accessibilityLabel={label}
            accessibilityHint={details}
            className={isCompact ? undefined : 'h-auto rounded-full px-0'}
        >
            {chip}
        </Button>
    )
}
