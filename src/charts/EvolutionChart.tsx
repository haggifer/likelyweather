'use client'

import { getYDomain, getYTicks } from '@/charts/scales'
import useAnimatedDomain from '@/charts/useAnimatedDomain'
import useChartTheme from '@/charts/useChartTheme'
import useElementWidth from '@/charts/useElementWidth'
import { formatNumber } from '@/lib/format'
import { EvolutionPoint } from '@/shared/api'
import { EVOLUTION_MAX_DAYS } from '@/shared/constants'
import { getStandardDeviation } from '@/shared/ensemble'
import { MODEL_BY_ID } from '@/shared/models'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { groups } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { useTranslations } from 'next-intl'
import { PointerEvent, useMemo, useState } from 'react'

interface IProps {
    points: EvolutionPoint[]
    variable: Variable
    ariaLabel: string
    height?: number
}

const MARGIN = { top: 16, right: 20, bottom: 34, left: 48 }
const STRIP_HEIGHT = 34
const LEAD_DAYS = Array.from({ length: EVOLUTION_MAX_DAYS + 1 }, (_, i) => EVOLUTION_MAX_DAYS - i)

export default function EvolutionChart({ points, variable, ariaLabel, height = 320 }: IProps) {
    const t = useTranslations('evolution')
    const theme = useChartTheme()
    const { ref, width } = useElementWidth<HTMLDivElement>()
    const [hoverLead, setHoverLead] = useState<number | null>(null)
    const info = VARIABLE_BY_ID[variable]
    const byModel = useMemo(() => groups(points, (p) => p.modelId), [points])
    const target = useMemo(
        () =>
            getYDomain(
                points.map((p) => p.value),
                variable,
            ),
        [points, variable],
    )
    const domain = useAnimatedDomain(target)
    const plotBottom = height - MARGIN.bottom - STRIP_HEIGHT
    const cellWidth = Math.max(0, width - MARGIN.left - MARGIN.right) / LEAD_DAYS.length
    const x = scaleLinear()
        .domain([EVOLUTION_MAX_DAYS, 0])
        .range([MARGIN.left + cellWidth / 2, width - MARGIN.right - cellWidth / 2])
    const y = scaleLinear().domain(domain).range([plotBottom, MARGIN.top])
    const toLine = line<EvolutionPoint>()
        .x((p) => x(p.leadDays))
        .y((p) => y(p.value))
        .curve(curveMonotoneX)
    const spread = LEAD_DAYS.map((d) => ({
        leadDays: d,
        sd: getStandardDeviation(points.filter((p) => p.leadDays === d).map((p) => p.value)),
    }))
    const maxSd = Math.max(...spread.map((s) => s.sd ?? 0), 0.001)
    const hoverRows =
        hoverLead === null ? [] : points.filter((p) => p.leadDays === hoverLead).sort((a, b) => b.value - a.value)

    const handlePointerMove = (e: PointerEvent<SVGRectElement>) => {
        const box = e.currentTarget.getBoundingClientRect()
        const lead = Math.round(x.invert(e.clientX - box.left + MARGIN.left))
        setHoverLead(Math.max(0, Math.min(EVOLUTION_MAX_DAYS, lead)))
    }

    return (
        <div ref={ref} className="relative w-full">
            <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
                {getYTicks(domain, variable, 5).map((tick) => (
                    <g key={tick}>
                        <line
                            x1={MARGIN.left}
                            x2={width - MARGIN.right}
                            y1={y(tick)}
                            y2={y(tick)}
                            stroke={theme.grid}
                        />
                        <text
                            x={MARGIN.left - 6}
                            y={y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                            fontSize={11}
                            fill={theme.muted}
                        >
                            {formatNumber(tick, Number.isInteger(tick) ? 0 : 1)}
                        </text>
                    </g>
                ))}
                {LEAD_DAYS.map((d) => (
                    <text key={d} x={x(d)} y={plotBottom + 16} textAnchor="middle" fontSize={11} fill={theme.muted}>
                        {d === 0 ? t('latest') : t('daysBefore', { days: d })}
                    </text>
                ))}
                {byModel.map(([modelId, modelPoints]) => {
                    const sorted = [...modelPoints].sort((a, b) => b.leadDays - a.leadDays)
                    const model = MODEL_BY_ID[modelId]

                    return (
                        <g key={modelId}>
                            <path
                                d={toLine(sorted) ?? ''}
                                fill="none"
                                stroke={model.color}
                                strokeWidth={1.75}
                                strokeDasharray={model.dash}
                                opacity={0.9}
                            />
                            {sorted.map((p) => (
                                <circle
                                    key={p.leadDays}
                                    cx={x(p.leadDays)}
                                    cy={y(p.value)}
                                    r={3}
                                    fill={model.color}
                                    stroke={theme.card}
                                    strokeWidth={1.5}
                                />
                            ))}
                        </g>
                    )
                })}
                {hoverLead !== null && (
                    <line
                        x1={x(hoverLead)}
                        x2={x(hoverLead)}
                        y1={MARGIN.top}
                        y2={plotBottom}
                        stroke={theme.muted}
                        pointerEvents="none"
                    />
                )}
                <text x={MARGIN.left} y={height - STRIP_HEIGHT + 2} fontSize={10} fill={theme.muted}>
                    {t('convergence')}
                </text>
                {spread.map((s) => (
                    <g key={s.leadDays}>
                        <rect
                            x={x(s.leadDays) - cellWidth / 2 + 2}
                            y={height - STRIP_HEIGHT + 8}
                            width={Math.max(0, cellWidth - 4)}
                            height={20}
                            rx={3}
                            fill={theme.band}
                            opacity={s.sd === null ? 0.05 : 0.12 + 0.7 * (s.sd / maxSd)}
                        />
                        <text
                            x={x(s.leadDays)}
                            y={height - STRIP_HEIGHT + 18}
                            dy="0.32em"
                            textAnchor="middle"
                            fontSize={10}
                            fontWeight={600}
                            fill={theme.foreground}
                        >
                            {s.sd === null ? '–' : `±${formatNumber(s.sd, info.decimals === 0 ? 1 : info.decimals)}`}
                        </text>
                    </g>
                ))}
                <rect
                    x={MARGIN.left}
                    y={MARGIN.top}
                    width={Math.max(0, width - MARGIN.left - MARGIN.right)}
                    height={Math.max(0, plotBottom - MARGIN.top)}
                    fill="transparent"
                    onPointerMove={handlePointerMove}
                    onPointerLeave={() => setHoverLead(null)}
                />
            </svg>
            {hoverLead !== null && hoverRows.length > 0 && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
                    style={
                        x(hoverLead) > width / 2 ? { right: width - x(hoverLead) + 10 } : { left: x(hoverLead) + 10 }
                    }
                >
                    <div className="mb-1 text-muted-foreground">
                        {hoverLead === 0 ? t('latest') : t('daysBefore', { days: hoverLead })}
                    </div>
                    {hoverRows.map((r) => (
                        <div key={r.modelId} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-0.5 w-3" style={{ background: MODEL_BY_ID[r.modelId].color }} />
                                {MODEL_BY_ID[r.modelId].name}
                            </span>
                            <span className="font-medium">{formatNumber(r.value, info.decimals)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
