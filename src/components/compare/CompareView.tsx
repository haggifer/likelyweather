'use client'

import { getYDomain } from '@/charts/scales'
import ForecastPreview from '@/components/city/ForecastPreview'
import VariableSwitch from '@/components/city/VariableSwitch'
import FlagIcon from '@/components/shell/FlagIcon'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCities, useCompare } from '@/hooks/queries'
import useUrlSync from '@/hooks/useUrlSync'
import { getCityLabel, getCityName } from '@/lib/format'
import { MAX_COMPARE_CITIES, SEED_CITY_IDS } from '@/shared/constants'
import { useAppSelector } from '@/store'
import { Plus, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'

const citiesParser = parseAsArrayOf(parseAsString).withDefault([])

export default function CompareView() {
    const t = useTranslations('compare')
    const locale = useLocale()
    const { isHydrated } = useUrlSync(['variable'])
    const variable = useAppSelector((s) => s.dashboard.variable)
    const [slugs, setSlugs] = useQueryState('cities', citiesParser)
    const { data: cities } = useCities()
    const { data, isFetching } = useCompare(isHydrated ? slugs : [], variable)
    const available = (cities?.items ?? []).filter((c) => !slugs.includes(c.slug))
    const sharedDomain = useMemo(
        () =>
            data?.items.length
                ? getYDomain(
                      data.items.flatMap((i) => i.latest?.series.flatMap((s) => s.values) ?? []),
                      variable,
                  )
                : undefined,
        [data, variable],
    )

    const handleAdd = (slug: string) => void setSlugs([...slugs, slug].slice(0, MAX_COMPARE_CITIES))

    const handleSeed = () => {
        const seedSlugs = SEED_CITY_IDS.slice(0, MAX_COMPARE_CITIES)
            .map((id) => cities?.items.find((c) => c.id === id)?.slug)
            .filter((s): s is string => Boolean(s))
        void setSlugs(seedSlugs)
    }

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <VariableSwitch />
                {slugs.length < MAX_COMPARE_CITIES && (
                    <Select value="" onValueChange={handleAdd}>
                        <SelectTrigger size="sm" className="w-56">
                            <Plus className="size-3.5" />
                            <SelectValue placeholder={t('add')} />
                        </SelectTrigger>
                        <SelectContent>
                            {available.map((c) => (
                                <SelectItem key={c.slug} value={c.slug}>
                                    {getCityLabel(c, locale)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {!slugs.length && (
                    <Button variant="outline" size="sm" onClick={handleSeed}>
                        {t('seed')}
                    </Button>
                )}
                <span className="text-xs text-muted-foreground">
                    {t('count', { count: slugs.length, max: MAX_COMPARE_CITIES })}
                </span>
            </div>
            {!slugs.length && <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>}
            <div className="grid gap-(--card-gap) md:grid-cols-2">
                {slugs.map((slug) => {
                    const item = data?.items.find((i) => i.city.slug === slug)

                    return (
                        <Card key={slug} className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-semibold">
                                    {item && <FlagIcon countryCode={item.city.countryCode} />}
                                    {item ? (
                                        <Link href={`/city/${slug}`} className="hover:underline">
                                            {getCityName(item.city, locale)}
                                        </Link>
                                    ) : (
                                        slug
                                    )}
                                </CardTitle>
                                <CardAction>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => void setSlugs(slugs.filter((s) => s !== slug))}
                                        aria-label={t('remove')}
                                    >
                                        <X />
                                    </Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent>
                                {item?.latest ? (
                                    <ForecastPreview
                                        city={item.city}
                                        latest={item.latest}
                                        variable={variable}
                                        ariaLabel={getCityName(item.city, locale)}
                                        yDomain={sharedDomain}
                                    />
                                ) : (
                                    <Skeleton className="h-[220px]" />
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            {slugs.length > 1 && <p className="text-xs text-muted-foreground">{t('sharedAxis')}</p>}
        </div>
    )
}
