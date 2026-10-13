import { useArchive } from '@fa/api-client/hooks/useArchive'
import { useCity } from '@fa/api-client/hooks/useCity'
import { getArchiveDirections, getArchiveSeries } from '@fa/chart-core/archive-stats'
import { ArchiveResponse, City } from '@fa/shared/api'
import {
    ArchiveRange,
    getArchiveSlots,
    getDefaultArchiveRange,
    getLatestArchiveDate,
    isValidArchiveRange,
} from '@fa/shared/archive'
import { getCityRegion } from '@fa/shared/city-region'
import { formatDateKey, getCityName } from '@fa/shared/format'
import { getVisiblePanels, OverviewPanels } from '@fa/shared/overview-panels'
import { SlidersHorizontal } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useArchiveSettings } from '../../hooks/useArchiveSettings'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useNow } from '../../hooks/useNow'
import { useTheme } from '../../hooks/useTheme'
import { MedianOverview, MedianOverviewSkeleton } from '../charts/MedianOverview'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { OverviewPanelsSheet } from '../home/OverviewPanelsSheet'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorNotice } from '../ui/ErrorNotice'
import { FlagIcon } from '../ui/FlagIcon'
import { LoadingStatus } from '../ui/LoadingStatus'
import { Text } from '../ui/Text'
import { ArchivePeriodPicker } from './ArchivePeriodPicker'

// Typing a date passes through other valid dates, and each new period could cost the viewer a request, so the period
// settles for a moment before it is asked for, as on the web.
const RANGE_DEBOUNCE_MS = 700
const RANGE_SEPARATOR = '|'
const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

const styles = StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
    title: { flex: 1, fontSize: 19, fontWeight: '700' },
    region: { fontSize: 15, fontWeight: '500' },
    notice: { fontSize: 14, lineHeight: 21, textAlign: 'center', paddingVertical: 40 },
    source: { fontSize: 12, lineHeight: 17 },
    panels: { alignSelf: 'flex-end' },
})

const toRangeKey = (range: ArchiveRange | null) => (range ? `${range.from}${RANGE_SEPARATOR}${range.to}` : null)

const fromRangeKey = (key: string | null): ArchiveRange | null => {
    if (!key) return null

    const [from, to] = key.split(RANGE_SEPARATOR)

    return { from, to }
}

// The stored period, or the week up to yesterday when there is none or it is no longer one the API accepts.
const resolveRange = (stored: ArchiveRange | null, now: Date, city: City): ArchiveRange =>
    stored && isValidArchiveRange(stored, getLatestArchiveDate(now, city.timezone))
        ? stored
        : getDefaultArchiveRange(now, city.timezone)

const isEmptyArchive = (archive: ArchiveResponse) => archive.values.temp.every((v) => v === null)

interface IProps {
    slug: string
}

// A city's past weather drawn like Home's overview: the reader's panels (the archive keeps its own choice), the
// period picker and the source.
export function ArchiveCard({ slug }: IProps) {
    const t = useTranslations('archive')
    const to = useTranslations('overview')
    const locale = useLocale()
    const now = useNow()
    const { colors } = useTheme()
    const { settings, setSettings } = useArchiveSettings()

    const [isCustomizing, setIsCustomizing] = useState(false)

    const { data: city, error: cityError, refetch: refetchCity } = useCity(slug)

    const range = city ? resolveRange(settings.range, now, city) : null
    const debouncedKey = useDebouncedValue(toRangeKey(range), RANGE_DEBOUNCE_MS)
    // The first period is asked for at once; only later changes wait for the reader to settle.
    const requested = fromRangeKey(debouncedKey ?? toRangeKey(range))

    const archive = useArchive(city ? slug : null, requested)

    const visible = useMemo(() => getVisiblePanels(settings.panels), [settings.panels])
    const slots = useMemo(
        () => (archive.data && city ? getArchiveSlots(archive.data, city.timezone) : null),
        [archive.data, city],
    )
    const series = useMemo(
        () => (archive.data && slots ? getArchiveSeries(archive.data, slots) : null),
        [archive.data, slots],
    )
    const directions = useMemo(
        () => (archive.data && slots ? getArchiveDirections(archive.data, slots) : null),
        [archive.data, slots],
    )
    const name = city ? getCityName(city, locale) : ''
    const region = city ? getCityRegion(city, locale) : null
    const shown = archive.data ?? null

    const handleRange = (next: ArchiveRange) => setSettings((s) => ({ ...s, range: next }))
    const handlePanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
        setSettings((s) => ({ ...s, panels: update(s.panels) }))
    const handleCustomize = () => setIsCustomizing(true)
    const handleCloseCustomize = () => setIsCustomizing(false)

    const renderChart = () => {
        if (archive.error && !shown) {
            return <ErrorNotice error={archive.error} onRetry={() => void archive.refetch()} />
        }

        if (shown && isEmptyArchive(shown)) {
            return (
                <Text style={[styles.notice, { color: colors['muted-foreground'] }]} accessibilityLiveRegion="polite">
                    {t('unavailable')}
                </Text>
            )
        }

        if (!shown || !series || !city) {
            return (
                <View accessible accessibilityLiveRegion="polite" accessibilityLabel={t('fetching', { name })}>
                    <MedianOverviewSkeleton panels={visible} isArchive />
                </View>
            )
        }

        return (
            <MedianOverview
                key={`${shown.from}${RANGE_SEPARATOR}${shown.to}`}
                panels={visible}
                series={series}
                directions={directions}
                chance={null}
                timeZone={city.timezone}
                locale={locale}
                now={null}
                isArchive
                accessibilityLabel={t('aria', {
                    name,
                    from: formatDateKey(shown.from, locale, DATE_FORMAT),
                    to: formatDateKey(shown.to, locale, DATE_FORMAT),
                })}
            />
        )
    }

    if (cityError) {
        return (
            <Card>
                <ErrorNotice error={cityError} onRetry={() => void refetchCity()} />
            </Card>
        )
    }

    // The sheet lives beside the card, so it stays open whatever the card shows while a period loads.
    return (
        <>
            <Card>
                <View style={styles.titleRow}>
                    {city ? (
                        <>
                            <FlagIcon countryCode={city.countryCode} width={24} />
                            <Text style={[styles.title, { color: colors.foreground }]}>
                                {name}
                                {region ? (
                                    <Text style={[styles.region, { color: colors['muted-foreground'] }]}>
                                        , {region}
                                    </Text>
                                ) : null}
                            </Text>
                            <FavoriteToggle place={city} />
                        </>
                    ) : (
                        <LoadingStatus label={to('loading')} />
                    )}
                </View>
                {range && city && (
                    <>
                        <ArchivePeriodPicker
                            range={range}
                            latest={getLatestArchiveDate(now, city.timezone)}
                            onChange={handleRange}
                        />
                        <Button
                            icon={SlidersHorizontal}
                            label={to('panels')}
                            variant="outline"
                            onPress={handleCustomize}
                            style={styles.panels}
                        />
                    </>
                )}
                {renderChart()}
                <Text style={[styles.source, { color: colors['muted-foreground'] }]}>{t('source')}</Text>
            </Card>
            <OverviewPanelsSheet
                panels={settings.panels}
                onChange={handlePanels}
                isOpen={isCustomizing}
                onClose={handleCloseCustomize}
            />
        </>
    )
}
