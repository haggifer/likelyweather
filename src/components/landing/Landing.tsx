'use client'

import CityOverview from '@/components/landing/CityOverview'
import FlagIcon from '@/components/shell/FlagIcon'
import SearchBox from '@/components/shell/SearchBox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCityName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SEEDS, slugify, START_WITH_IDS } from '@/shared/seeds'
import { BookOpen, Columns3, Split } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { parseAsString, useQueryState } from 'nuqs'

const START_WITH = START_WITH_IDS.map((id) => SEEDS.find((s) => s.id === id)!).map((seed) => ({
    ...seed,
    slug: slugify(seed.name, seed.countryCode, seed.id),
}))

const cityParser = parseAsString.withDefault(START_WITH[0].slug)

export default function Landing() {
    const t = useTranslations('landing')
    const locale = useLocale()
    const [slug, setSlug] = useQueryState('city', cityParser)
    const tiles = [
        { key: 'disagree', icon: Split, href: `/city/${slug}` },
        { key: 'compare', icon: Columns3, href: '/compare' },
        { key: 'method', icon: BookOpen, href: '/methodology' },
    ] as const

    return (
        <div className="flex flex-col gap-6 py-6">
            <section className="flex flex-col items-center gap-5 text-center">
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t('hero')}</h1>
                <p className="max-w-2xl text-base text-pretty text-muted-foreground">{t('sub')}</p>
                <div className="flex w-full flex-col items-center gap-3">
                    <SearchBox enableShortcut onSelectCity={(next) => void setSlug(next)} />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('seeds')}</span>
                        {START_WITH.map((city) => (
                            <button
                                key={city.id}
                                type="button"
                                onClick={() => void setSlug(city.slug)}
                                aria-pressed={slug === city.slug}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[13px] font-medium transition-colors hover:border-primary hover:text-primary',
                                    slug === city.slug &&
                                        'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
                                )}
                            >
                                <FlagIcon countryCode={city.countryCode} />
                                {getCityName(city, locale)}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
            <div className="mx-auto grid w-full max-w-5xl gap-6 3xl:max-w-none 3xl:grid-cols-[minmax(0,64rem)_minmax(0,1fr)]">
                <section className="min-w-0" aria-live="polite">
                    <CityOverview key={slug} slug={slug} />
                </section>
                <section className="grid gap-(--card-gap) sm:grid-cols-3 3xl:auto-rows-fr 3xl:grid-cols-1">
                    {tiles.map(({ key, icon: Icon, href }) => (
                        <Link key={key} href={href} className="group">
                            <Card className="h-full gap-2 transition-colors group-hover:border-primary">
                                <CardHeader>
                                    <Icon className="size-5 text-primary" aria-hidden="true" />
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
