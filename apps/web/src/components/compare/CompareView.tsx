'use client'

import { ForecastPreview } from '@/components/city/ForecastPreview'
import { VariableSwitch } from '@/components/city/VariableSwitch'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useAppSelector } from '@/store'
import { useCities } from '@fa/api-client/hooks/useCities'
import { useCompare } from '@fa/api-client/hooks/useCompare'
import { getYDomain } from '@fa/chart-core/scales'
import { City, CompareResponse } from '@fa/shared/api'
import { MAX_COMPARE_CITIES, SEED_CITY_IDS } from '@fa/shared/constants'
import { getCityLabel, getCityName } from '@fa/shared/format'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Button } from '@fa/ui/components/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@fa/ui/components/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@fa/ui/components/select'
import { Skeleton } from '@fa/ui/components/skeleton'
import { useNow } from '@fa/ui/hooks/useNow'
import { Plus, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'

type CompareItem = CompareResponse['items'][number]

const citiesParser = parseAsArrayOf(parseAsString).withDefault([])

const toCompareItem = (item: CompareItem, variable: Variable): CompareItem => ({
    ...item,
    latest:
        item.latest &&
        toSlotLatest(
            item.latest,
            buildSlots(getChartStart(item.latest, item.city.timezone), DASHBOARD_HOURS),
            VARIABLE_BY_ID[variable].aggregation,
        ),
})

const getSharedDomain = (items: CompareItem[], variable: Variable) =>
    items.length
        ? getYDomain(
              items.flatMap((i) => i.latest?.series.flatMap((s) => s.values) ?? []),
              variable,
          )
        : undefined

const getSeedSlugs = (cities: City[]) =>
    SEED_CITY_IDS.slice(0, MAX_COMPARE_CITIES)
        .map((id) => cities.find((c) => c.id === id)?.slug)
        .filter((s): s is string => Boolean(s))

export function CompareView() {
    const t = useTranslations('compare')
    const locale = useLocale()
    const now = useNow()
    const { isHydrated } = useUrlSync()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const [slugs, setSlugs] = useQueryState('cities', citiesParser)

    const { data: cities } = useCities()
    const { data, isFetching } = useCompare(isHydrated ? slugs : [], variable)

    const available = (cities?.items ?? []).filter((c) => !slugs.includes(c.slug))
    const items = useMemo(() => (data?.items ?? []).map((item) => toCompareItem(item, variable)), [data, variable])
    const sharedDomain = useMemo(() => getSharedDomain(items, variable), [items, variable])

    const handleAdd = (slug: string) => void setSlugs([...slugs, slug].slice(0, MAX_COMPARE_CITIES))
    const handleRemove = (slug: string) => void setSlugs(slugs.filter((s) => s !== slug))
    const handleSeed = () => void setSlugs(getSeedSlugs(cities?.items ?? []))

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
                        <SelectTrigger size="sm" className="w-full sm:w-56">
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
                    const item = items.find((i) => i.city.slug === slug)

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
                                        onClick={() => handleRemove(slug)}
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
                                        now={now}
                                        yDomain={sharedDomain}
                                    />
                                ) : (
                                    <Skeleton className="h-[13.75rem]" />
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
