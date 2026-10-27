'use client'

import { ArchiveCard } from '@/components/archive/ArchiveCard'
import { PlaceChips } from '@/components/landing/PlaceChips'
import { SearchBox } from '@/components/shell/SearchBox'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlaces } from '@/hooks/usePlaces'
import { cn } from '@/lib/cn'
import { FILL_HEIGHT_PARENT } from '@/lib/fill-height'
import { usePendingTrack } from '@fa/api-client/hooks/usePendingTrack'
import { getPlaceChips } from '@fa/shared/places'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

export function ArchiveView() {
    const t = useTranslations('archive')
    const places = usePlaces()
    const [urlSlug, setSlug] = useQueryState('city', parseAsString)
    const pending = usePendingTrack()

    const chips = places ? getPlaceChips(places) : null
    // A place being stored is already the picked one: no chip is selected and its card is loading.
    const slug = pending ? null : (urlSlug ?? chips?.[0]?.slug ?? null)

    const handleSelect = (next: string) => void setSlug(next)

    return (
        <div className={cn('flex flex-col gap-4 pt-0 pb-0 sm:gap-6 sm:pt-5 sm:pb-6', FILL_HEIGHT_PARENT)}>
            <section className="flex flex-col items-center gap-3 text-center sm:gap-5">
                <h1 className="sr-only">{t('heading')}</h1>
                <div className="flex w-full flex-col items-center gap-3">
                    <SearchBox onSelectCity={handleSelect} className="max-w-2xl" />
                    <PlaceChips places={places} chips={chips} slug={slug} onSelect={handleSelect} />
                </div>
            </section>
            <section className={cn('mx-auto w-full max-w-[70rem] max-sm:-mx-4 max-sm:w-auto', FILL_HEIGHT_PARENT)}>
                {slug ? (
                    <ArchiveCard key={slug} slug={slug} />
                ) : (
                    <Card data-bleed>
                        <CardContent>
                            <Skeleton className="h-96" />
                        </CardContent>
                    </Card>
                )}
            </section>
        </div>
    )
}
