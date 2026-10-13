import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from '@fa/shared/constants'
import { formatStepLabel, formatTime } from '@fa/shared/format'
import { getAgeHours } from '@fa/shared/time'
import { ClockAlert } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { showSnackbar } from '../../lib/snackbar-store'
import { StatusChip } from '../legacy-ui/StatusChip'

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
const ICON_SIZE = 20

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
    const { colors } = useTheme()

    const hours = getAgeHours(fetchedAt, now)
    const isStale = hours > STALE_AFTER_HOURS
    const label = t('forecastAge', { hours })
    const chip = isCompact ? (
        <ClockAlert size={ICON_SIZE} color={colors.warning} />
    ) : (
        <StatusChip tone={isStale ? 'warn' : 'ok'} label={label} />
    )

    if (hours < REFRESH_AFTER_HOURS) return null

    if (!issueTime || !timeZone) return chip

    const runTimes = t('forecastTitle', {
        time: formatStepLabel(issueTime, timeZone, locale),
        utc: `${formatTime(issueTime, 'UTC', locale, CLOCK)} UTC`,
        fetched: formatStepLabel(fetchedAt, timeZone, locale),
    })
    const details = isStale ? `${runTimes} ${t('forecastOldTitle')}` : runTimes

    return (
        <Pressable
            onPress={() => showSnackbar(isCompact ? `${label}. ${details}` : details)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={details}
        >
            {chip}
        </Pressable>
    )
}
