'use client'

import ChartFrame from '@/charts/ChartFrame'
import EvolutionChart from '@/charts/EvolutionChart'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCity, useEvolution, useSteps } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import useUrlSync from '@/hooks/useUrlSync'
import { formatNumber, formatStepLabel } from '@/lib/format'
import { EVOLUTION_MAX_DAYS } from '@/shared/constants'
import { getStandardDeviation } from '@/shared/ensemble'
import { MODEL_BY_ID, MODELS } from '@/shared/models'
import { VARIABLE_BY_ID } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setValidTime } from '@/store/filtersSlice'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    slug: string
}

const LEAD_DAYS = Array.from({ length: EVOLUTION_MAX_DAYS + 1 }, (_, i) => EVOLUTION_MAX_DAYS - i)

export default function EvolutionView({ slug }: IProps) {
    const t = useTranslations('evolution')
    const tv = useTranslations('variables')
    const locale = useLocale()
    const dispatch = useAppDispatch()
    const now = useNow()
    const { isHydrated } = useUrlSync(['variable', 'validTime'])
    const variable = useAppSelector((s) => s.dashboard.variable)
    const chosen = useAppSelector((s) => s.filters.validTime)
    const { data: city } = useCity(slug)
    const { data: stepsData } = useSteps(slug)
    const steps = stepsData?.steps ?? []
    const past = now ? steps.filter((s) => new Date(s) <= now) : []
    const future = now ? steps.filter((s) => new Date(s) > now) : []
    const validTime = chosen && steps.includes(chosen) ? chosen : (past.at(-1) ?? null)
    const { data, isFetching, isPlaceholderData } = useEvolution(slug, variable, isHydrated ? validTime : null)
    const info = VARIABLE_BY_ID[variable]

    if (!city) return null

    const timeZone = city.timezone
    const spreads = data
        ? LEAD_DAYS.map((d) => getStandardDeviation(data.points.filter((p) => p.leadDays === d).map((p) => p.value)))
        : []
    const firstSpread = spreads.find((s) => s !== null) ?? null
    const lastSpread = spreads.at(-1) ?? null

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">{t('validTime')}</span>
                <Select value={validTime ?? undefined} onValueChange={(v) => dispatch(setValidTime(v))}>
                    <SelectTrigger size="sm" className="w-64">
                        <SelectValue placeholder={t('pick')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>{t('past')}</SelectLabel>
                            {[...past].reverse().map((s) => (
                                <SelectItem key={s} value={s}>
                                    {formatStepLabel(s, timeZone, locale)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>{t('future')}</SelectLabel>
                            {future.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {formatStepLabel(s, timeZone, locale)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            {!data || !validTime ? (
                <Skeleton className="h-[380px]" />
            ) : (
                <ChartFrame
                    title={t('title', { variable: tv(variable), time: formatStepLabel(validTime, timeZone, locale) })}
                    description={t('description')}
                    isFetching={isFetching && isPlaceholderData}
                    summary={t('summary', {
                        first: formatNumber(firstSpread, info.decimals === 0 ? 1 : info.decimals),
                        last: formatNumber(lastSpread, info.decimals === 0 ? 1 : info.decimals),
                        unit: info.unit,
                        truth:
                            data.truth === null
                                ? t('noTruth')
                                : `${formatNumber(data.truth, info.decimals)} ${info.unit}`,
                    })}
                    table={
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('model')}</TableHead>
                                    {LEAD_DAYS.map((d) => (
                                        <TableHead key={d} className="text-right">
                                            {d === 0 ? t('latest') : t('daysBefore', { days: d })}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MODELS.filter((m) => data.points.some((p) => p.modelId === m.id)).map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>{MODEL_BY_ID[m.id].name}</TableCell>
                                        {LEAD_DAYS.map((d) => (
                                            <TableCell key={d} className="text-right">
                                                {formatNumber(
                                                    data.points.find((p) => p.modelId === m.id && p.leadDays === d)
                                                        ?.value,
                                                    info.decimals,
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    }
                >
                    {data.points.length ? (
                        <EvolutionChart
                            points={data.points}
                            truth={data.truth}
                            variable={variable}
                            ariaLabel={t('title', {
                                variable: tv(variable),
                                time: formatStepLabel(validTime, timeZone, locale),
                            })}
                        />
                    ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
                    )}
                </ChartFrame>
            )}
        </div>
    )
}
