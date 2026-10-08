'use client'

import { ForecastPreview } from '@/components/city/ForecastPreview'
import { VariableSwitch } from '@/components/city/VariableSwitch'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { SearchBox } from '@/components/shell/SearchBox'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNow } from '@/hooks/useNow'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useAppSelector } from '@/store'
import { useCompare } from '@fa/api-client/hooks/useCompare'
import { getYDomain } from '@fa/chart-core/scales'
import { CompareResponse } from '@fa/shared/api'
import { MAX_COMPARE_CITIES, SEED_CITY_IDS } from '@fa/shared/constants'
import { getCityName } from '@fa/shared/format'
import { SEEDS, slugify } from '@fa/shared/seeds'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { X } from 'lucide-react'
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

const SEED_SLUGS = SEED_CITY_IDS.slice(0, MAX_COMPARE_CITIES)
    .map((id) => SEEDS.find((seed) => seed.id === id))
    .filter((seed) => seed !== undefined)
    .map((seed) => slugify(seed.name, seed.countryCode, seed.id))

export function CompareView() {
    const t = useTranslations('compare')
    const te = useTranslations('errors')
    const locale = useLocale()
    const now = useNow()
    const { isHydrated } = useUrlSync()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const [slugs, setSlugs] = useQueryState('cities', citiesParser)

    const shown = slugs.slice(0, MAX_COMPARE_CITIES)
    const { data, error, isFetching, refetch } = useCompare(isHydrated ? shown : [], variable)

    const items = useMemo(() => (data?.items ?? []).map((item) => toCompareItem(item, variable)), [data, variable])
    const sharedDomain = useMemo(() => getSharedDomain(items, variable), [items, variable])
    const isSettled = !isFetching && (Boolean(data) || Boolean(error))

    const handleAdd = (slug: string) => void setSlugs([...shown.filter((s) => s !== slug), slug])
    const handleRemove = (slug: string) => void setSlugs(shown.filter((s) => s !== slug))
    const handleSeed = () => void setSlugs(SEED_SLUGS)

    // The API leaves out slugs it does not know, and gives `latest: null` when a city could not be refreshed.
    const renderCardBody = (slug: string) => {
        const item = items.find((i) => i.city.slug === slug)

        if (item?.latest) {
            return (
                <ForecastPreview
                    city={item.city}
                    latest={item.latest}
                    variable={variable}
                    ariaLabel={getCityName(item.city, locale)}
                    now={now}
                    yDomain={sharedDomain}
                />
            )
        }

        if (!item && !isSettled) return <Skeleton className="h-[13.75rem]" />

        return (
            <p className="flex h-[13.75rem] items-center justify-center text-center text-sm text-muted-foreground">
                {item || error ? t('noForecast') : te('notFound')}
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <VariableSwitch />
                {shown.length < MAX_COMPARE_CITIES && <SearchBox onSelectCity={handleAdd} className="sm:max-w-xs" />}
                {!shown.length && (
                    <Button variant="outline" size="sm" onClick={handleSeed}>
                        {t('seed')}
                    </Button>
                )}
                <span className="text-xs text-muted-foreground">
                    {t('count', { count: shown.length, max: MAX_COMPARE_CITIES })}
                </span>
            </div>
            {!shown.length && <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>}
            {error && <ErrorNotice error={error} onRetry={() => void refetch()} />}
            <div className="grid gap-(--card-gap) md:grid-cols-2">
                {shown.map((slug) => {
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
                            <CardContent>{renderCardBody(slug)}</CardContent>
                        </Card>
                    )
                })}
            </div>
            {shown.length > 1 && <p className="text-xs text-muted-foreground">{t('sharedAxis')}</p>}
        </div>
    )
}
