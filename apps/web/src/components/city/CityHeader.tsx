'use client'

import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { RefreshButton } from '@/components/city/RefreshButton'
import { UpdatedChip } from '@/components/city/UpdatedChip'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { SearchBox } from '@/components/shell/SearchBox'
import { useLatest } from '@/hooks/useLatest'
import { getCityRegion } from '@/lib/city-region'
import { isRefreshOffered } from '@/lib/refresh-due'
import { City } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { Button } from '@fa/ui/components/button'
import { useNow } from '@fa/ui/hooks/useNow'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface IProps {
    city: City
}

// The city name doubles as a switcher: the pencil swaps it for a search box holding the current name, selected so
// typing replaces it. Picking a result opens that city; Escape or clicking away keeps this one.
export function CityHeader({ city }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const now = useNow()
    const queryClient = useQueryClient()

    const pencilRef = useRef<HTMLButtonElement>(null)
    const [isEditing, setIsEditing] = useState(false)

    // The dashboard anchors its chart to the precipitation query, so that query also dates the run shown here.
    const { data: latest } = useLatest(city.slug, Variable.Precip)
    const isFetching = useIsFetching({ queryKey: ['latest', city.slug] }) > 0

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const isOutdated = isRefreshOffered(latest?.fetchedAt, now)

    // Refetching moves the dashboard chart only when a newer run arrives.
    const handleRefresh = () => void queryClient.refetchQueries({ queryKey: ['latest', city.slug], type: 'active' })
    // Closing the switcher unmounts its input; unless the click that closed it focused something else, keyboard focus
    // goes back to the pencil that opened it.
    const handleDismiss = () => {
        flushSync(() => setIsEditing(false))

        if (document.activeElement === document.body) pencilRef.current?.focus()
    }

    return (
        <div className="mb-(--card-gap) flex flex-col gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground max-sm:hidden">
                <Link href={`/?city=${city.slug}`}>
                    <ArrowLeft /> {t('back')}
                </Link>
            </Button>
            {isEditing ? (
                <SearchBox initialQuery={name} autoFocus onDismiss={handleDismiss} className="max-w-none" />
            ) : (
                <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="-ml-1.5 shrink-0 text-muted-foreground sm:hidden"
                        >
                            <Link href={`/?city=${city.slug}`} aria-label={t('back')} title={t('back')}>
                                <ArrowLeft />
                            </Link>
                        </Button>
                        <h1 className="flex min-w-0 items-center gap-2.5 text-xl tracking-tight sm:text-2xl">
                            <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                            <span className="truncate" title={region ? `${name}, ${region}` : name}>
                                <span className="font-bold">{name}</span>
                                {region && (
                                    <span className="font-medium text-muted-foreground max-sm:hidden">, {region}</span>
                                )}
                            </span>
                        </h1>
                        <FavoriteToggle place={city} />
                        <Button
                            ref={pencilRef}
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
                        {latest && (
                            <UpdatedChip
                                issueTime={latest.issueTime}
                                fetchedAt={latest.fetchedAt}
                                timeZone={city.timezone}
                                now={now}
                            />
                        )}
                        <RefreshButton
                            isAvailable={isOutdated}
                            isFetching={isFetching}
                            onRefresh={handleRefresh}
                            labelClassName="max-sm:sr-only"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
