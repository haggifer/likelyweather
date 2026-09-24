'use client'

import { BiasOverTimeChart, ErrorByLeadChart } from '@/charts/CitySkillCharts'
import { LineSwatch } from '@/components/city/ModelLegend'
import VariableSwitch from '@/components/city/VariableSwitch'
import SegmentedFilter from '@/components/scoreboard/SegmentedFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCities, useModelDetail } from '@/hooks/queries'
import useUrlSync from '@/hooks/useUrlSync'
import { formatNumber, formatSigned, formatStepLabel, getCityName } from '@/lib/format'
import { SKILL_WINDOWS, SkillWindow } from '@/shared/constants'
import { MODEL_BY_ID, ModelId } from '@/shared/models'
import { VARIABLE_BY_ID } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setWindow } from '@/store/filtersSlice'
import { Info, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

interface IProps {
    modelId: ModelId
}

export default function ModelDetailView({ modelId }: IProps) {
    const t = useTranslations('model')
    const ts = useTranslations('scoreboard')
    const locale = useLocale()
    const dispatch = useAppDispatch()
    const { isHydrated } = useUrlSync(['variable', 'window'])
    const variable = useAppSelector((s) => s.dashboard.variable)
    const window = useAppSelector((s) => s.filters.window)
    const { data, isFetching } = useModelDetail(modelId, variable, window, isHydrated)
    const { data: cities } = useCities()
    const model = MODEL_BY_ID[modelId]
    const info = VARIABLE_BY_ID[variable]
    const cityBySlug = new Map(cities?.items.map((c) => [c.slug, c]))
    const cityName = (slug: string) => {
        const city = cityBySlug.get(slug)
        return city ? getCityName(city, locale) : slug
    }

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                    <LineSwatch color={model.color} dash={model.dash} width={28} />
                    {model.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t('subtitle', { provider: model.provider, source: model.source })}
                    {model.regional && ` · ${t('regional')}`}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <VariableSwitch />
                <SegmentedFilter
                    label={ts('window')}
                    value={window}
                    options={SKILL_WINDOWS.map((w) => ({ value: w, label: ts('days', { days: w }) }))}
                    onChange={(w: SkillWindow) => dispatch(setWindow(w))}
                />
                {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            {model.source !== 'open-meteo' && (
                <p className="flex items-start gap-2 rounded-lg border border-info/40 bg-info/10 px-4 py-3 text-sm">
                    <Info className="mt-0.5 size-4 shrink-0 text-info" />
                    {t('noArchive')}
                </p>
            )}
            {!data ? (
                <div className="grid gap-(--card-gap) md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[300px]" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid gap-(--card-gap) md:grid-cols-2 xl:grid-cols-3">
                        {data.cities.map((c) => (
                            <Card key={c.slug} className="gap-2">
                                <CardHeader>
                                    <CardTitle className="font-semibold">
                                        <Link href={`/city/${c.slug}/scoreboard`} className="hover:underline">
                                            {cityName(c.slug)}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {t('biasTitle', { unit: info.unit })}
                                    </span>
                                    <BiasOverTimeChart data={c.biasDaily} color={model.color} unit={info.unit} />
                                    <span className="text-xs text-muted-foreground">
                                        {t('errorByLeadTitle', { unit: info.unit })}
                                    </span>
                                    <ErrorByLeadChart data={c.errorByLead} color={model.color} unit={info.unit} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-semibold">{t('worstTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table className="text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('city')}</TableHead>
                                        <TableHead>{ts('validTime')}</TableHead>
                                        <TableHead className="text-right">{ts('lead')}</TableHead>
                                        <TableHead className="text-right">{ts('forecast')}</TableHead>
                                        <TableHead className="text-right">{ts('truth')}</TableHead>
                                        <TableHead className="text-right">{ts('error')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.worst.map((w) => (
                                        <TableRow key={`${w.slug}-${w.leadBucket}-${w.validTime}`}>
                                            <TableCell>{cityName(w.slug)}</TableCell>
                                            <TableCell>
                                                {formatStepLabel(
                                                    w.validTime,
                                                    cityBySlug.get(w.slug)?.timezone ?? 'UTC',
                                                    locale,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{w.leadBucket}h</TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(w.forecast, info.decimals)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(w.truth, info.decimals)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatSigned(w.error, info.decimals)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!data.worst.length && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                {t('noErrors')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
