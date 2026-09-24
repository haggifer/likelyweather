'use client'

import ChartFrame from '@/charts/ChartFrame'
import SkillHeatmap, { SelectedCell } from '@/charts/SkillHeatmap'
import RankingTable from '@/components/scoreboard/RankingTable'
import SegmentedFilter from '@/components/scoreboard/SegmentedFilter'
import { Skeleton } from '@/components/ui/skeleton'
import { useCity, useScoreboard } from '@/hooks/queries'
import useUrlSync from '@/hooks/useUrlSync'
import { formatNumber, formatTime } from '@/lib/format'
import { TruthMode } from '@/shared/api'
import { LEAD_BUCKETS, LeadBucket, SKILL_WINDOWS, SkillWindow } from '@/shared/constants'
import { MODELS } from '@/shared/models'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setLead, setMode, setWindow } from '@/store/filtersSlice'
import { Info, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface IProps {
    slug: string
}

const MIN_DAYS = 7
const DAY_MS = 86_400_000

export default function ScoreboardView({ slug }: IProps) {
    const t = useTranslations('scoreboard')
    const tv = useTranslations('variables')
    const locale = useLocale()
    const dispatch = useAppDispatch()
    const { isHydrated } = useUrlSync(['variable', 'window', 'mode', 'lead'])
    const variable = useAppSelector((s) => s.dashboard.variable)
    const { window, mode, lead } = useAppSelector((s) => s.filters)
    const [selected, setSelected] = useState<SelectedCell | null>(null)
    const { data: city } = useCity(slug)
    const { data, isFetching, isPlaceholderData, isError, error } = useScoreboard(
        slug,
        { variable, window, mode },
        isHydrated,
    )
    const info = VARIABLE_BY_ID[variable]

    if (!city) return null

    const filters = (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <SegmentedFilter
                label={t('window')}
                value={window}
                options={SKILL_WINDOWS.map((w) => ({ value: w, label: t('days', { days: w }) }))}
                onChange={(w: SkillWindow) => dispatch(setWindow(w))}
            />
            <SegmentedFilter
                label={t('truthMode')}
                value={mode}
                options={[
                    { value: 'consensus', label: t('consensus') },
                    { value: 'self', label: t('self') },
                ]}
                onChange={(m: TruthMode) => dispatch(setMode(m))}
            />
            <SegmentedFilter
                label={t('lead')}
                value={lead}
                options={LEAD_BUCKETS.map((l) => ({ value: l, label: `${l}h` }))}
                onChange={(l: LeadBucket) => dispatch(setLead(l))}
            />
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t('loading')} />}
        </div>
    )

    if (!data) {
        return (
            <div className="flex flex-col gap-(--card-gap)">
                {filters}
                {isError ? (
                    <p className="text-sm text-destructive">{error.message}</p>
                ) : (
                    <>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                            <Loader2 className="size-4 animate-spin" /> {t('computing', { window })}
                        </p>
                        <Skeleton className="h-[360px]" />
                    </>
                )}
            </div>
        )
    }

    if (data.daysCollected < MIN_DAYS) {
        const opensOn = new Date(new Date(city.firstTrackedAt).getTime() + MIN_DAYS * DAY_MS)

        return (
            <div className="flex flex-col gap-(--card-gap)">
                {filters}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="font-semibold">{t('youngTitle')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('youngBody', {
                            collected: data.daysCollected,
                            required: MIN_DAYS,
                            date: formatTime(opensOn.toISOString(), city.timezone, locale, {
                                day: 'numeric',
                                month: 'long',
                            }),
                        })}
                    </p>
                    <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-primary"
                            style={{ width: `${(data.daysCollected / MIN_DAYS) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    const leadCells = data.cells.filter((c) => c.leadBucket === lead)
    const models = MODELS.map((m) => m.id).filter((id) => data.cells.some((c) => c.modelId === id))
    const winner = leadCells
        .filter((c) => c.n >= data.minN && c.mae !== null)
        .sort((a, b) => (a.mae ?? 0) - (b.mae ?? 0))[0]

    return (
        <div className="flex flex-col gap-(--card-gap)">
            {filters}
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {t(mode === 'consensus' ? 'truthNoteConsensus' : 'truthNoteSelf')}
            </p>
            <ChartFrame
                title={t('rankingTitle', { variable: tv(variable), lead, window })}
                description={t('rankingDescription', { minN: data.minN, days: data.daysCollected })}
                isFetching={isFetching && isPlaceholderData}
                summary={
                    winner
                        ? t('rankingSummary', {
                              model: MODELS.find((m) => m.id === winner.modelId)?.name ?? winner.modelId,
                              mae: formatNumber(winner.mae, info.decimals + 1),
                              unit: info.unit,
                              lead,
                          })
                        : t('noRanking')
                }
            >
                <RankingTable
                    cells={leadCells}
                    minN={data.minN}
                    decimals={info.decimals}
                    unit={info.unit}
                    showHitRate={variable === Variable.Precip}
                />
            </ChartFrame>
            <ChartFrame
                title={t('heatmapTitle')}
                description={t('heatmapDescription')}
                isFetching={isFetching && isPlaceholderData}
            >
                <SkillHeatmap
                    cells={data.cells}
                    models={models}
                    minN={data.minN}
                    decimals={info.decimals + 1}
                    unit={info.unit}
                    timeZone={city.timezone}
                    locale={locale}
                    selected={selected}
                    onSelect={setSelected}
                />
            </ChartFrame>
        </div>
    )
}
