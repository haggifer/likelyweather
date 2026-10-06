'use client'

import { OverviewCardSkeleton } from '@/components/city/OverviewCard'
import { CityOverview } from '@/components/landing/CityOverview'
import { PlaceChip } from '@/components/landing/PlaceChip'
import { SearchBox } from '@/components/shell/SearchBox'
import { usePlaces } from '@/hooks/usePlaces'
import { useStarters } from '@/hooks/useStarters'
import { updatePlaces } from '@/lib/places-store'
import { DEFAULT_PLACES, getPlaceChips, getStarterPlaces, isFavorite, MAX_PLACES } from '@fa/shared/places'
import { Card, CardContent, CardHeader, CardTitle } from '@fa/ui/components/card'
import { Skeleton } from '@fa/ui/components/skeleton'
import { BookOpen, Columns3, Split } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'

const CHIP_PLACEHOLDERS = Array.from({ length: MAX_PLACES }, (_, i) => i)

const getTiles = (slug: string) =>
    [
        { key: 'disagree', icon: Split, href: `/city/${slug}` },
        { key: 'compare', icon: Columns3, href: '/compare' },
        { key: 'method', icon: BookOpen, href: '/methodology' },
    ] as const

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
    const tiles = getTiles(slug ?? DEFAULT_PLACES.recents[0].slug)

    useEffect(() => {
        if (isFirstVisit && starters.data?.items.length) updatePlaces(() => getStarterPlaces(starters.data.items))
    }, [isFirstVisit, starters.data])

    return (
        <div className="flex flex-col gap-6 py-6">
            <section className="flex flex-col items-center gap-5 text-center">
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t('hero')}</h1>
                <p className="max-w-2xl text-base text-pretty text-muted-foreground">{t('sub')}</p>
                <div className="flex w-full flex-col items-center gap-3">
                    <SearchBox isLocateShown onSelectCity={(next) => void setSlug(next)} />
                    <div
                        role="group"
                        aria-label={t('seeds')}
                        className="flex flex-wrap items-center justify-center gap-2"
                    >
                        <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">
                            {t('seeds')}
                        </span>
                        {chips?.map((place) => (
                            <PlaceChip
                                key={place.id}
                                place={place}
                                isSelected={slug === place.slug}
                                isPinned={Boolean(places && isFavorite(places, place.id))}
                                onSelect={(next) => void setSlug(next)}
                            />
                        ))}
                        {!chips && CHIP_PLACEHOLDERS.map((i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
                    </div>
                </div>
            </section>
            <div className="mx-auto grid w-full max-w-5xl gap-6 3xl:max-w-none 3xl:grid-cols-[minmax(0,64rem)_minmax(0,1fr)]">
                <section className="min-w-0">
                    {slug ? <CityOverview key={slug} slug={slug} /> : <OverviewCardSkeleton status={to('loading')} />}
                </section>
                <section className="grid gap-(--card-gap) sm:grid-cols-3 3xl:auto-rows-fr 3xl:grid-cols-1">
                    {tiles.map(({ key, icon: Icon, href }) => (
                        <Link key={key} href={href} className="group">
                            <Card className="h-full gap-2 transition-colors group-hover:border-primary">
                                <CardHeader className="flex items-center gap-2">
                                    <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                                    <CardTitle className="font-semibold">{t(`tiles.${key}.title`)}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    {t(`tiles.${key}.body`)}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </section>
            </div>
        </div>
    )
}
