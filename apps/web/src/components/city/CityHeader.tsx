'use client'

import UpdatedChip from '@/components/city/UpdatedChip'
import FlagIcon from '@/components/shell/FlagIcon'
import SearchBox from '@/components/shell/SearchBox'
import StatusChip from '@/components/shell/StatusChip'
import { Button } from '@/components/ui/button'
import { useLatest } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import { getCityName, getCountryName } from '@fa/shared/format'
import { cn } from '@/lib/utils'
import { CityDetail, CityStatus } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

interface IProps {
    city: CityDetail
}

// The city name doubles as a switcher: the pencil swaps it for a search box holding the current name, selected so
// typing replaces it. Picking a result opens that city; Escape or clicking away keeps this one.
export default function CityHeader({ city }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const now = useNow()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    // The dashboard anchors its chart to the precipitation query, so that query also dates the run shown here.
    const { data: latest } = useLatest(city.slug, Variable.Precip)
    const isFetching = useIsFetching({ queryKey: ['latest', city.slug] }) > 0
    const name = getCityName(city, locale)
    const region = [city.admin1, getCountryName(city.countryCode, city.country, locale)].filter(Boolean).join(', ')

    // Refetching re-anchors the dashboard chart at the current slot. The server only calls the upstream sources when
    // a newer run exists, so unlike the landing card the button is not gated on the chart being stale.
    const handleRefresh = () => void queryClient.refetchQueries({ queryKey: ['latest', city.slug], type: 'active' })

    return (
        <div className="mb-(--card-gap) flex flex-col gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
                <Link href={`/?city=${city.slug}`}>
                    <ArrowLeft /> {t('back')}
                </Link>
            </Button>
            {isEditing ? (
                <SearchBox initialQuery={name} autoFocus onDismiss={() => setIsEditing(false)} className="max-w-none" />
            ) : (
                <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <h1 className="flex min-w-0 items-center gap-2.5 text-2xl tracking-tight">
                            <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                            <span className="truncate">
                                <span className="font-bold">{name}</span>
                                {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                            </span>
                        </h1>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setIsEditing(true)}
                            aria-label={t('change')}
                            title={t('change')}
                            className="shrink-0 text-muted-foreground"
                        >
                            <Pencil />
                        </Button>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {city.isPreviewOnly && (
                            <StatusChip tone="info" title={t('previewTitle')} className="h-7">
                                {t('preview')}
                            </StatusChip>
                        )}
                        {city.status !== CityStatus.Active && (
                            <StatusChip tone="warn" className="h-7">
                                {t(`status.${city.status}`)}
                            </StatusChip>
                        )}
                        {latest && (
                            <UpdatedChip
                                issueTime={latest.issueTime}
                                fetchedAt={latest.fetchedAt}
                                timeZone={city.timezone}
                                now={now}
                            />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                            title={t('refreshTitle')}
                        >
                            <RefreshCw className={cn(isFetching && 'animate-spin')} /> {t('refresh')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
