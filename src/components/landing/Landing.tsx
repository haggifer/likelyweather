'use client'

import ForecastPreview from '@/components/city/ForecastPreview'
import FlagIcon from '@/components/shell/FlagIcon'
import SearchBox from '@/components/shell/SearchBox'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCities, useLatest, usePopularCities } from '@/hooks/queries'
import { getCityName } from '@/lib/format'
import { City } from '@/shared/api'
import { SEED_CITY_IDS } from '@/shared/constants'
import { Variable } from '@/shared/variables'
import { ArrowRight, Columns3, LineChart, Trophy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

interface CityChipProps {
    city: City
    locale: string
}

const SEED_CHIPS = 4

const CityChip = ({ city, locale }: CityChipProps) => (
    <Link
        href={`/city/${city.slug}`}
        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[13px] font-medium transition-colors hover:border-primary hover:text-primary"
    >
        <FlagIcon countryCode={city.countryCode} />
        {getCityName(city, locale)}
    </Link>
)

export default function Landing() {
    const t = useTranslations('landing')
    const locale = useLocale()
    const { data: popular } = usePopularCities(6)
    const { data: cities } = useCities()
    const seeds = SEED_CITY_IDS.map((id) => cities?.items.find((c) => c.id === id)).filter((c): c is City => Boolean(c))
    const featured = popular?.[0] ?? seeds[0]
    const { data: latest } = useLatest(featured?.slug ?? '', Variable.Temp, Boolean(featured))
    const tiles = [
        { key: 'compare', icon: Columns3, href: '/compare' },
        { key: 'converge', icon: LineChart, href: featured ? `/city/${featured.slug}/evolution` : '/cities' },
        { key: 'score', icon: Trophy, href: featured ? `/city/${featured.slug}/scoreboard` : '/cities' },
    ] as const

    return (
        <div className="flex flex-col gap-10 py-6">
            <section className="flex flex-col items-center gap-5 text-center">
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t('hero')}</h1>
                <p className="max-w-2xl text-base text-pretty text-muted-foreground">{t('sub')}</p>
                <SearchBox variant="hero" />
                <div className="flex flex-col items-center gap-2">
                    {popular && popular.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{t('popular')}</span>
                            {popular.map((c) => (
                                <CityChip key={c.id} city={c} locale={locale} />
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('seeds')}</span>
                        {seeds.slice(0, SEED_CHIPS).map((c) => (
                            <CityChip key={c.id} city={c} locale={locale} />
                        ))}
                    </div>
                </div>
            </section>
            <Card className="mx-auto w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="font-semibold">
                        {featured ? t('previewTitle', { name: getCityName(featured, locale) }) : t('previewLoading')}
                    </CardTitle>
                    <CardDescription>{t('previewDescription')}</CardDescription>
                    {featured && (
                        <CardAction>
                            <Button asChild size="sm">
                                <Link href={`/city/${featured.slug}`}>
                                    {t('open')} <ArrowRight />
                                </Link>
                            </Button>
                        </CardAction>
                    )}
                </CardHeader>
                <CardContent>
                    {featured && latest ? (
                        <ForecastPreview
                            city={featured}
                            latest={latest}
                            variable={Variable.Temp}
                            ariaLabel={t('previewTitle', { name: getCityName(featured, locale) })}
                            height={240}
                        />
                    ) : (
                        <Skeleton className="h-[240px]" />
                    )}
                </CardContent>
            </Card>
            <section className="mx-auto grid w-full max-w-4xl gap-(--card-gap) sm:grid-cols-3">
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
    )
}
