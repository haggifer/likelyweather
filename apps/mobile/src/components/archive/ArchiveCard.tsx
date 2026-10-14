import { useArchive } from '@fa/api-client/hooks/useArchive'
import { useCity } from '@fa/api-client/hooks/useCity'
import { getArchiveHourlySeries } from '@fa/chart-core/archive-stats'
import { useFirstValue } from '@fa/hooks/useFirstValue'
import {
    ARCHIVE_LABEL_DATE_FORMAT,
    ArchiveRange,
    getArchiveRangeKey,
    getLatestArchiveDate,
    isEmptyArchive,
    resolveArchiveRange,
} from '@fa/shared/archive'
import { getCityRegion } from '@fa/shared/city-region'
import { formatDateKey, getCityName } from '@fa/shared/format'
import { getVisiblePanels, OverviewPanels } from '@fa/shared/overview-panels'
import { useMemo } from 'react'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useArchiveSettings } from '../../hooks/useArchiveSettings'
import { useNow } from '../../hooks/useNow'
import { cn } from '../../lib/cn'
import { MedianOverview, MedianOverviewSkeleton } from '../charts/MedianOverview'
import { FavoriteToggle } from '../city/FavoriteToggle'
import { OverviewPanelsMenu } from '../home/OverviewPanelsMenu'
import { Card, CardContent, CardHeader } from '../ui/card'
import { BLEED_CARD } from '../ui/EdgeSheet'
import { ErrorNotice } from '../ui/ErrorNotice'
import { FlagIcon } from '../ui/FlagIcon'
import { LoadingStatus } from '../ui/LoadingStatus'
import { Text } from '../ui/text'
import { ArchivePeriodPicker } from './ArchivePeriodPicker'

interface IProps {
    slug: string
}

// A city's past weather drawn like Home's overview: the reader's panels (the archive keeps its own choice), the
// period picker and the source.
export function ArchiveCard({ slug }: IProps) {
    const t = useTranslations('archive')
    const to = useTranslations('overview')
    const locale = useLocale()
    // The period and its calendar keep the day the page opened on, so the city's midnight neither moves nor refetches them.
    const openedAt = useFirstValue(useNow())
    const { settings, setSettings } = useArchiveSettings()

    const { data: city, error: cityError, refetch: refetchCity } = useCity(slug)

    // The calendar applies a period only once both ends are picked, so it is asked for at once.
    const range = city ? resolveArchiveRange(settings.range, openedAt, city.timezone) : null

    const archive = useArchive(city ? slug : null, range)

    const visible = useMemo(() => getVisiblePanels(settings.panels), [settings.panels])
    const series = useMemo(() => (archive.data ? getArchiveHourlySeries(archive.data) : null), [archive.data])
    const directions = archive.data?.values.windDir ?? null
    const name = city ? getCityName(city, locale) : ''
    const region = city ? getCityRegion(city, locale) : null
    const shown = archive.data ?? null

    const handleRange = (next: ArchiveRange) => setSettings((s) => ({ ...s, range: next }))
    const handlePanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
        setSettings((s) => ({ ...s, panels: update(s.panels) }))

    const renderChart = () => {
        if (archive.error && !shown) {
            return <ErrorNotice error={archive.error} onRetry={() => void archive.refetch()} />
        }

        if (shown && isEmptyArchive(shown)) {
            return (
                <Text className="py-10 text-center text-sm text-muted-foreground" accessibilityLiveRegion="polite">
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
                key={getArchiveRangeKey(shown)}
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
                    from: formatDateKey(shown.from, locale, ARCHIVE_LABEL_DATE_FORMAT),
                    to: formatDateKey(shown.to, locale, ARCHIVE_LABEL_DATE_FORMAT),
                })}
            />
        )
    }

    if (cityError) {
        return (
            <Card className={cn('py-10', BLEED_CARD)}>
                <CardContent>
                    <ErrorNotice error={cityError} onRetry={() => void refetchCity()} />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn('gap-0 pt-3 pb-4', BLEED_CARD)}>
            <CardHeader className="min-h-9 flex-row items-center gap-2.5 px-4">
                {city ? (
                    <>
                        <FlagIcon countryCode={city.countryCode} width={24} />
                        <Text className="flex-1 text-lg font-bold tracking-tight">
                            {name}
                            {region ? (
                                <Text className="text-lg font-medium text-muted-foreground">, {region}</Text>
                            ) : null}
                        </Text>
                        <FavoriteToggle place={city} />
                    </>
                ) : (
                    <LoadingStatus label={to('loading')} />
                )}
            </CardHeader>
            <CardContent className="gap-1 px-4">
                {range && city && (
                    <View className="mt-2 flex-row flex-wrap items-start justify-between gap-3">
                        <ArchivePeriodPicker
                            range={range}
                            latest={getLatestArchiveDate(openedAt, city.timezone)}
                            onChange={handleRange}
                        />
                        <OverviewPanelsMenu panels={settings.panels} onChange={handlePanels} className="ml-auto" />
                    </View>
                )}
                {renderChart()}
                <Text className="text-xs text-muted-foreground">{t('source')}</Text>
            </CardContent>
        </Card>
    )
}
