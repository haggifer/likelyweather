'use client'

import { ArchivePeriodPicker } from '@/components/archive/ArchivePeriodPicker'
import { MedianOverview, MedianOverviewSkeleton } from '@/components/charts/MedianOverview'
import { NoDataOverlay } from '@/components/charts/NoDataOverlay'
import { OverviewTable } from '@/components/charts/OverviewTable'
import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { PHONE_ICON } from '@/components/city/overview-controls'
import { OverviewPanelsMenu } from '@/components/city/OverviewPanelsMenu'
import { ViewModeToggle } from '@/components/city/ViewModeToggle'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useArchiveSettings } from '@/hooks/useArchiveSettings'
import { useNow } from '@/hooks/useNow'
import { useViewMode } from '@/hooks/useViewMode'
import { cn } from '@/lib/cn'
import { FILL_HEIGHT_PARENT } from '@/lib/fill-height'
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
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface IProps {
    slug: string
}

// The archive keeps its own choice of panels, apart from the overview's.
export function ArchiveCard({ slug }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()
    // The period and its calendar keep the day the page opened on, so the city's midnight neither moves nor refetches them.
    const openedAt = useFirstValue(useNow())
    const { settings, setSettings } = useArchiveSettings()
    const { isTable } = useViewMode()

    const { data: city, error: cityError, refetch: refetchCity } = useCity(slug)

    // The calendar applies a period only once both ends are picked, so it is asked for at once.
    const range = city && openedAt ? resolveArchiveRange(settings.range, openedAt, city.timezone) : null

    const archive = useArchive(city ? slug : null, range)

    const visible = useMemo(() => getVisiblePanels(settings.panels), [settings.panels])
    const series = useMemo(() => (archive.data ? getArchiveHourlySeries(archive.data) : null), [archive.data])
    const directions = archive.data?.values.windDir ?? null
    const name = city ? getCityName(city, locale) : null
    const region = city ? getCityRegion(city, locale) : null
    const shown = archive.data ?? null

    const handleRange = (next: ArchiveRange) => setSettings((s) => ({ ...s, range: next }))
    const handlePanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
        setSettings((s) => ({ ...s, panels: update(s.panels) }))
    const renderArchive = () => {
        if (archive.error && !shown) {
            return <ErrorNotice error={archive.error} onRetry={() => void archive.refetch()} />
        }

        if (!shown || !series || !city) {
            return (
                <div role="status" aria-label={t('fetching', { name: name ?? '' })}>
                    <MedianOverviewSkeleton panels={visible} />
                </div>
            )
        }

        return (
            <div className={cn('relative', FILL_HEIGHT_PARENT)}>
                {isTable ? (
                    <OverviewTable
                        panels={visible}
                        series={series}
                        chance={null}
                        timeZone={city.timezone}
                        locale={locale}
                    />
                ) : (
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
                        ariaLabel={t('aria', {
                            name: name ?? '',
                            from: formatDateKey(shown.from, locale, ARCHIVE_LABEL_DATE_FORMAT),
                            to: formatDateKey(shown.to, locale, ARCHIVE_LABEL_DATE_FORMAT),
                        })}
                    />
                )}
                {isEmptyArchive(shown) && <NoDataOverlay message={t('unavailable')} />}
            </div>
        )
    }

    if (cityError) {
        return (
            <Card data-bleed>
                <CardContent className="py-10">
                    <ErrorNotice error={cityError} onRetry={() => void refetchCity()} />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card data-bleed className={cn('gap-0 max-sm:pt-3', FILL_HEIGHT_PARENT)}>
            <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2.5 text-lg tracking-tight sm:text-xl">
                    {city ? (
                        <>
                            <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                            <span className="min-w-0">
                                <span className="font-bold">{name}</span>
                                {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                            </span>
                            <FavoriteToggle place={city} className="-ml-1 max-sm:ml-auto" />
                        </>
                    ) : (
                        <span className="flex h-7 items-center gap-2 text-sm font-normal text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className={cn('flex flex-col gap-1', FILL_HEIGHT_PARENT)}>
                {range && openedAt && city && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <OverviewPanelsMenu
                                panels={settings.panels}
                                onChange={handlePanels}
                                isLabelHiddenOnPhones
                                className={PHONE_ICON}
                            />
                            <ViewModeToggle className={PHONE_ICON} />
                        </div>
                        <ArchivePeriodPicker
                            range={range}
                            latest={getLatestArchiveDate(openedAt, city.timezone)}
                            onChange={handleRange}
                        />
                    </div>
                )}
                {renderArchive()}
                <p className="text-xs text-muted-foreground max-sm:text-sm">{t('source')}</p>
            </CardContent>
        </Card>
    )
}
