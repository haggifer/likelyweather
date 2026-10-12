'use client'

import { ArchivePeriodPicker } from '@/components/archive/ArchivePeriodPicker'
import { MedianOverview, MedianOverviewSkeleton } from '@/components/charts/MedianOverview'
import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { OverviewPanelsMenu } from '@/components/city/OverviewPanelsMenu'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useArchiveSettings } from '@/hooks/useArchiveSettings'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useNow } from '@/hooks/useNow'
import { useArchive } from '@fa/api-client/hooks/useArchive'
import { useCity } from '@fa/api-client/hooks/useCity'
import { getArchiveDirections, getArchiveSeries } from '@fa/chart-core/archive-stats'
import { ArchiveResponse, City } from '@fa/shared/api'
import {
    ArchiveRange,
    countArchiveDays,
    getDefaultArchiveRange,
    getLatestArchiveDate,
    isValidArchiveRange,
} from '@fa/shared/archive'
import { getCityRegion } from '@fa/shared/city-region'
import { formatDateKey, getCityName, getLocalMidnight } from '@fa/shared/format'
import { getVisiblePanels, OverviewPanels } from '@fa/shared/overview-panels'
import { buildSlots, getSlotStart } from '@fa/shared/slots'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface IProps {
    slug: string
}

// Typing a date in the picker passes through other valid dates, and each new period could cost the viewer a request,
// so the period settles for a moment before it is asked for.
const RANGE_DEBOUNCE_MS = 700
const RANGE_SEPARATOR = '|'

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

// The period's 3-hour slots from the city's first local midnight, as the overview lays out the forecast.
const getArchiveSlots = (range: ArchiveRange, timeZone: string) =>
    buildSlots(getSlotStart(getLocalMidnight(range.from, timeZone), timeZone), countArchiveDays(range) * 24)

const isEmptyArchive = (archive: ArchiveResponse) => archive.values.temp.every((v) => v === null)

// A city's past weather drawn like the forecast overview: the reader's panels (the archive keeps its own choice), the
// period picker and the source.
export function ArchiveCard({ slug }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()
    const now = useNow()
    const { settings, setSettings } = useArchiveSettings()

    const { data: city, error: cityError, refetch: refetchCity } = useCity(slug)

    const range = city && now ? resolveRange(settings.range, now, city) : null
    const requested = fromRangeKey(useDebouncedValue(toRangeKey(range), RANGE_DEBOUNCE_MS))

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

    const handleRange = (next: ArchiveRange) => setSettings((s) => ({ ...s, range: next }))
    const handlePanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
        setSettings((s) => ({ ...s, panels: update(s.panels) }))

    if (cityError) {
        return (
            <Card data-bleed>
                <CardContent className="py-10">
                    <ErrorNotice error={cityError} onRetry={() => void refetchCity()} />
                </CardContent>
            </Card>
        )
    }

    const name = city ? getCityName(city, locale) : null
    const region = city ? getCityRegion(city, locale) : null
    const shown = archive.data ?? null

    return (
        <Card data-bleed className="gap-0 max-sm:pt-3">
            <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2.5 text-lg tracking-tight sm:text-xl">
                    {city ? (
                        <>
                            <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                            <span className="min-w-0 sm:truncate">
                                <span className="font-bold">{name}</span>
                                {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                            </span>
                            <FavoriteToggle place={city} className="-ml-1 max-sm:ml-auto" />
                            <OverviewPanelsMenu
                                panels={settings.panels}
                                onChange={handlePanels}
                                className="-ml-2 shrink-0 pointer-coarse:size-9"
                            />
                        </>
                    ) : (
                        <span className="flex h-7 items-center gap-2 text-sm font-normal text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {range && now && city && (
                    <ArchivePeriodPicker
                        range={range}
                        latest={getLatestArchiveDate(now, city.timezone)}
                        onChange={handleRange}
                    />
                )}
                {archive.error && !shown && (
                    <ErrorNotice error={archive.error} onRetry={() => void archive.refetch()} />
                )}
                {shown && isEmptyArchive(shown) && (
                    <p className="py-10 text-center text-sm text-muted-foreground">{t('unavailable')}</p>
                )}
                {shown && !isEmptyArchive(shown) && series && city ? (
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
                        ariaLabel={t('aria', {
                            name: name ?? '',
                            from: formatDateKey(shown.from, locale, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            }),
                            to: formatDateKey(shown.to, locale, { day: 'numeric', month: 'short', year: 'numeric' }),
                        })}
                    />
                ) : (
                    !archive.error && (
                        <div role="status" aria-label={t('fetching', { name: name ?? '' })}>
                            <MedianOverviewSkeleton panels={visible} />
                        </div>
                    )
                )}
                <p className="text-xs text-muted-foreground">{t('source')}</p>
            </CardContent>
        </Card>
    )
}
