'use client'

import useChartTheme from '@/charts/useChartTheme'
import useElementWidth from '@/charts/useElementWidth'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { formatNumber, formatSigned, formatStepLabel } from '@/lib/format'
import { SkillCell } from '@/shared/api'
import { LEAD_BUCKETS } from '@/shared/constants'
import { MODEL_BY_ID, ModelId } from '@/shared/models'
import { getRelativeLuminance } from '@/theme/contrast'
import { HeatmapScale } from '@/theme/tokens'
import { scaleBand, scaleSequential } from 'd3-scale'
import { interpolateBlues, interpolateGreys, interpolateViridis } from 'd3-scale-chromatic'
import { useTranslations } from 'next-intl'
import { KeyboardEvent, useId, useMemo } from 'react'

export interface SelectedCell {
    modelId: ModelId
    leadBucket: number
}

interface IProps {
    cells: SkillCell[]
    models: ModelId[]
    minN: number
    decimals: number
    unit: string
    timeZone: string
    locale: string
    selected: SelectedCell | null
    onSelect: (cell: SelectedCell | null) => void
}

const LABEL_WIDTH = 116
const ROW_HEIGHT = 32
const HEADER_HEIGHT = 24

const INTERPOLATORS: Record<HeatmapScale, (t: number) => string> = {
    blues: (t) => interpolateBlues(0.12 + t * 0.8),
    viridis: (t) => interpolateViridis(1 - t),
    grays: (t) => interpolateGreys(0.08 + t * 0.8),
}

const toHex = (color: string) => {
    if (color.startsWith('#')) return color

    const [r, g, b] = color.match(/\d+/g)!.map(Number)
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export default function SkillHeatmap({
    cells,
    models,
    minN,
    decimals,
    unit,
    timeZone,
    locale,
    selected,
    onSelect,
}: IProps) {
    const t = useTranslations('scoreboard')
    const theme = useChartTheme()
    const hatchId = useId().replace(/:/g, '')
    const { ref, width } = useElementWidth<HTMLDivElement>()
    const height = HEADER_HEIGHT + models.length * ROW_HEIGHT
    const byKey = useMemo(() => new Map(cells.map((c) => [`${c.modelId}:${c.leadBucket}`, c])), [cells])
    const valid = cells.filter((c) => c.n >= minN && c.mae !== null).map((c) => c.mae as number)
    const color = scaleSequential(INTERPOLATORS[theme.heatmap]).domain([
        Math.min(...valid, 0),
        Math.max(...valid, 0.001),
    ])
    const x = scaleBand<number>()
        .domain([...LEAD_BUCKETS])
        .range([LABEL_WIDTH, Math.max(LABEL_WIDTH + 200, width)])
        .paddingInner(0.06)
    const y = scaleBand<ModelId>().domain(models).range([HEADER_HEIGHT, height]).paddingInner(0.1)
    const selectedCell = selected ? byKey.get(`${selected.modelId}:${selected.leadBucket}`) : undefined

    const handleKey = (e: KeyboardEvent, cell: SelectedCell) => {
        if (e.key !== 'Enter' && e.key !== ' ') return

        e.preventDefault()
        onSelect(cell)
    }

    return (
        <div ref={ref} className="relative w-full">
            <svg width={width} height={height} role="grid" aria-label={t('heatmapLabel')} className="block">
                <defs>
                    <pattern
                        id={hatchId}
                        width="6"
                        height="6"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        <rect width="6" height="6" fill={theme.card} />
                        <line x1="0" y1="0" x2="0" y2="6" stroke={theme.border} strokeWidth="2" />
                    </pattern>
                </defs>
                {LEAD_BUCKETS.map((lead) => (
                    <text
                        key={lead}
                        x={(x(lead) ?? 0) + x.bandwidth() / 2}
                        y={14}
                        textAnchor="middle"
                        fontSize={11}
                        fill={theme.muted}
                    >
                        {t('leadColumn', { hours: lead })}
                    </text>
                ))}
                {models.map((modelId) => (
                    <g key={modelId}>
                        <rect
                            x={0}
                            y={(y(modelId) ?? 0) + y.bandwidth() / 2 - 1.5}
                            width={12}
                            height={3}
                            fill={MODEL_BY_ID[modelId].color}
                            rx={1.5}
                        />
                        <text
                            x={18}
                            y={(y(modelId) ?? 0) + y.bandwidth() / 2}
                            dy="0.32em"
                            fontSize={12}
                            fill={theme.foreground}
                        >
                            {MODEL_BY_ID[modelId].name}
                        </text>
                        {LEAD_BUCKETS.map((lead) => {
                            const cell = byKey.get(`${modelId}:${lead}`)
                            const isSparse = !cell || cell.n < minN || cell.mae === null
                            const fill = isSparse ? `url(#${hatchId})` : color(cell.mae as number)
                            const isDark = !isSparse && getRelativeLuminance(toHex(fill)) < 0.35
                            const isSelected = selected?.modelId === modelId && selected.leadBucket === lead
                            const cx = x(lead) ?? 0
                            const cy = y(modelId) ?? 0

                            return (
                                <g
                                    key={lead}
                                    role="gridcell"
                                    tabIndex={cell ? 0 : -1}
                                    aria-label={`${MODEL_BY_ID[modelId].name}, ${lead}h: ${isSparse ? t('sparse', { n: cell?.n ?? 0 }) : `${formatNumber(cell.mae, decimals)} ${unit}`}`}
                                    onClick={() => cell && onSelect({ modelId, leadBucket: lead })}
                                    onKeyDown={(e) => handleKey(e, { modelId, leadBucket: lead })}
                                    className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-ring"
                                >
                                    <rect
                                        x={cx}
                                        y={cy}
                                        width={x.bandwidth()}
                                        height={y.bandwidth()}
                                        rx={3}
                                        fill={fill}
                                        stroke={isSelected ? theme.foreground : 'transparent'}
                                        strokeWidth={2}
                                    />
                                    <text
                                        x={cx + x.bandwidth() / 2}
                                        y={cy + y.bandwidth() / 2}
                                        dy="0.32em"
                                        textAnchor="middle"
                                        fontSize={11}
                                        fontWeight={isSparse ? 400 : 600}
                                        fill={isDark ? '#ffffff' : isSparse ? theme.muted : '#0b1b33'}
                                    >
                                        {isSparse ? `n=${cell?.n ?? 0}` : formatNumber(cell.mae, decimals)}
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                ))}
            </svg>
            <Popover open={Boolean(selectedCell)} onOpenChange={(open) => !open && onSelect(null)}>
                {selected && (
                    <PopoverAnchor
                        className="pointer-events-none absolute"
                        style={{
                            left: x(selected.leadBucket as (typeof LEAD_BUCKETS)[number]) ?? 0,
                            top: y(selected.modelId) ?? 0,
                            width: x.bandwidth(),
                            height: y.bandwidth(),
                        }}
                    />
                )}
                <PopoverContent
                    className="w-80 p-3 text-xs"
                    align="start"
                    onInteractOutside={(e) => {
                        // Pressing another cell switches the popover instead of dismissing it first.
                        if ((e.target as Element | null)?.closest('[role=gridcell]')) e.preventDefault()
                    }}
                >
                    {selectedCell && (
                        <div className="flex flex-col gap-2">
                            <div className="font-semibold">
                                {t('whyTitle', {
                                    model: MODEL_BY_ID[selectedCell.modelId].name,
                                    hours: selectedCell.leadBucket,
                                })}
                            </div>
                            <p className="text-muted-foreground">
                                {t('whyBody', {
                                    n: selectedCell.n,
                                    mae: formatNumber(selectedCell.mae, decimals),
                                    unit,
                                })}
                            </p>
                            <table className="w-full">
                                <thead className="text-muted-foreground">
                                    <tr>
                                        <th className="py-1 text-left font-medium">{t('validTime')}</th>
                                        <th className="py-1 text-right font-medium">{t('forecast')}</th>
                                        <th className="py-1 text-right font-medium">{t('truth')}</th>
                                        <th className="py-1 text-right font-medium">{t('error')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCell.worst.map((w) => (
                                        <tr key={w.validTime} className="border-t">
                                            <td className="py-1">{formatStepLabel(w.validTime, timeZone, locale)}</td>
                                            <td className="py-1 text-right">{formatNumber(w.forecast, decimals)}</td>
                                            <td className="py-1 text-right">{formatNumber(w.truth, decimals)}</td>
                                            <td className="py-1 text-right font-semibold">
                                                {formatSigned(w.error, decimals)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-2">
                    {formatNumber(color.domain()[0], decimals)}
                    <span
                        className="h-2.5 w-28 rounded-sm"
                        style={{
                            background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map((s) => color(color.domain()[0] + s * (color.domain()[1] - color.domain()[0]))).join(',')})`,
                        }}
                    />
                    {formatNumber(color.domain()[1], decimals)} {unit} {t('maeLegend')}
                </span>
                <span className="flex items-center gap-2">
                    <svg width="18" height="12" aria-hidden="true">
                        <rect width="18" height="12" rx="2" fill={`url(#${hatchId})`} stroke={theme.border} />
                    </svg>
                    {t('sparseLegend', { minN })}
                </span>
            </div>
        </div>
    )
}
