'use client'

import { FavoriteToggle } from '@/components/city/FavoriteToggle'
import { RefreshButton } from '@/components/city/RefreshButton'
import { UpdatedChip } from '@/components/city/UpdatedChip'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { SearchBox } from '@/components/shell/SearchBox'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { getPageTitle } from '@/lib/page-title'
import { useLatest } from '@fa/api-client/hooks/useLatest'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName, getCountryName } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface IProps {
    city: City
}

// On phones the header matches the app's: the age chip and Refresh form a second line only once the run is outdated;
// wider screens keep Refresh disabled with its hint until then.
export function CityHeader({ city }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const now = useNow()
    const queryClient = useQueryClient()

    const pencilRef = useRef<HTMLButtonElement>(null)
    const [isEditing, setIsEditing] = useState(false)

    // The dashboard anchors its chart to the precipitation query, so that query also dates the run shown here. When
    // it failed before any run arrived there is no date, but Refresh must stay available: it is the only way to ask
    // again. A failed refetch with a run on screen keeps the 3-hour rule.
    const { data: latest, isError } = useLatest(city.slug, Variable.Precip)
    // Only the queries on screen: the dashboard's background prefetch of the other variables would spin it after every
    // load.
    const isFetching = useIsFetching({ queryKey: ['latest', city.slug], type: 'active' }) > 0

    const name = getCityName(city, locale)
    const region = getCityRegion(city, locale)
    const isOutdated = (isError && !latest) || isRefreshOffered(latest?.fetchedAt, now)
    const title = getPageTitle(`${name}, ${getCountryName(city.countryCode, city.country, locale)}`)

    // Refetching moves the dashboard chart only when a newer run arrives.
    const handleRefresh = () => void queryClient.refetchQueries({ queryKey: ['latest', city.slug], type: 'active' })
    // Closing the switcher unmounts its input; unless the click that closed it focused something else, keyboard focus
    // goes back to the pencil that opened it.
    const handleDismiss = () => {
        flushSync(() => setIsEditing(false))

        if (document.activeElement === document.body) pencilRef.current?.focus()
    }

    useDocumentTitle(title)

    return (
        <div className="mb-2 flex flex-col gap-2 sm:gap-3">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="-my-1 -ml-2 h-9 self-start text-muted-foreground max-sm:h-11 max-sm:text-sm sm:pointer-coarse:-my-2 sm:pointer-coarse:h-11"
            >
                <Link href={`/?city=${city.slug}`}>
                    <ArrowLeft /> {t('back')}
                </Link>
            </Button>
            {isEditing ? (
                <SearchBox initialQuery={name} autoFocus onDismiss={handleDismiss} className="max-w-none" />
            ) : (
                <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 items-center gap-1.5 max-sm:w-full">
                        <h1 className="flex min-w-0 items-center gap-2.5 text-xl tracking-tight sm:text-2xl">
                            <FlagIcon countryCode={city.countryCode} className="h-4 w-6 shrink-0" />
                            <span>
                                <span className="font-bold">{name}</span>
                                {region && <span className="font-medium text-muted-foreground">, {region}</span>}
                            </span>
                        </h1>
                        <div className="flex shrink-0 items-center gap-1 max-sm:ml-auto">
                            <FavoriteToggle place={city} />
                            <Button
                                ref={pencilRef}
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setIsEditing(true)}
                                aria-label={t('change')}
                                title={t('change')}
                                className="shrink-0 text-muted-foreground touch:size-9 touch:hit-area"
                            >
                                <Pencil />
                            </Button>
                        </div>
                    </div>
                    <div
                        className={cn(
                            'ml-auto flex flex-wrap items-center justify-end gap-2',
                            !isOutdated && 'max-sm:hidden',
                        )}
                    >
                        {latest && (
                            <UpdatedChip
                                issueTime={latest.issueTime}
                                fetchedAt={latest.fetchedAt}
                                timeZone={city.timezone}
                                now={now}
                                className="max-sm:[&>[data-slot=badge]]:text-sm"
                            />
                        )}
                        <RefreshButton
                            isAvailable={isOutdated}
                            isFetching={isFetching}
                            onRefresh={handleRefresh}
                            className="touch:h-9 max-sm:text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
