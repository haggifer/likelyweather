'use client'

import { OverviewCardSkeleton } from '@/components/city/OverviewCard'
import { CityOverview } from '@/components/landing/CityOverview'
import { PlaceChips } from '@/components/landing/PlaceChips'
import { SearchBox } from '@/components/shell/SearchBox'
import { usePlaces } from '@/hooks/usePlaces'
import { useStarters } from '@/hooks/useStarters'
import { updatePlaces } from '@/lib/places-store'
import { DEFAULT_PLACES, getPlaceChips, getStarterPlaces } from '@fa/shared/places'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'

export function Landing() {
    const t = useTranslations('landing')
    const to = useTranslations('overview')
    const places = usePlaces()
    const [urlSlug, setSlug] = useQueryState('city', parseAsString)

    // Nothing stored yet reads back as the shared defaults object itself, which marks a first visit.
    const isFirstVisit = places === DEFAULT_PLACES
    const starters = useStarters(isFirstVisit)

    // While the country's chips are on their way, the chips and the overview wait rather than open a default city.
    const isChoosingStarters = isFirstVisit && starters.isLoading
    const chips = places && !isChoosingStarters ? getPlaceChips(places) : null
    // Without a city in the URL the overview opens the viewer's first chip, which is a pinned home city for most.
    const slug = urlSlug ?? chips?.[0].slug ?? null

    useEffect(() => {
        if (isFirstVisit && starters.data?.items.length) updatePlaces(() => getStarterPlaces(starters.data.items))
    }, [isFirstVisit, starters.data])

    return (
        <div className="flex flex-col gap-4 pt-2 pb-6 sm:gap-6 sm:pt-5">
            <section className="flex flex-col items-center gap-3 text-center sm:gap-5">
                {/* The search and the overview say what the page is for; the heading stays for screen readers and search
                    engines (author, 2026-10-12). */}
                <h1 className="sr-only">{t('heading')}</h1>
                <div className="flex w-full flex-col items-center gap-3">
                    <SearchBox isLocateShown onSelectCity={(next) => void setSlug(next)} className="max-w-2xl" />
                    <PlaceChips places={places} chips={chips} slug={slug} onSelect={(next) => void setSlug(next)} />
                </div>
            </section>
            <section className="mx-auto w-full max-w-[70rem] max-sm:-mx-4 max-sm:w-auto">
                {slug ? <CityOverview key={slug} slug={slug} /> : <OverviewCardSkeleton status={to('loading')} />}
            </section>
        </div>
    )
}
