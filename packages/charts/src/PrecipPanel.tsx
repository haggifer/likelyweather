'use client'

import { Series } from '@fa/shared/api'
import { formatNumber, formatPercent, formatPeriodLabel, formatTime } from '@fa/shared/format'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { addHours, getLocalDateKey, toIsoMinute } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { useTranslations } from 'next-intl'
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { useChartTheme } from './hooks/useChartTheme'
import { useElementWidth } from './hooks/useElementWidth'
import { formatYTick, getYDomain, getYTicks } from './scales'

interface Row {
    step: string
    median: number | null
    chance: number | null
    [modelId: string]: number | string | null
}

interface TickProps {
    x?: number | string
    y?: number | string
    index?: number
}

interface ModelTickProps {
    cx?: number
    cy?: number
    color: string
    dash?: string
}

interface TooltipContentProps {
    active?: boolean
    payload?: readonly { payload?: Row }[]
}

// Below this width per window the hour and chance labels touch, so every other one is shown.
const MIN_WIDTH_PER_LABEL = 28
const HOUR_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', hourCycle: 'h23' }

const toRows = (steps: string[], series: Series[], median: (number | null)[], chance: (number | null)[]): Row[] =>
    steps.map((step, i) => ({
        step,
        median: median[i],
        chance: chance[i],
        ...Object.fromEntries(series.map((s) => [s.modelId, s.values[i]])),
    }))

// A 6-hour total belongs to the day of its last hour; a new day starts where that day changes.
const getDayStarts = (steps: string[], timeZone: string) => {
    const dayKeys = steps.map((step) => getLocalDateKey(new Date(new Date(step).getTime() - 1).toISOString(), timeZone))

    return steps.filter((_, i) => i > 0 && dayKeys[i] !== dayKeys[i - 1])
}

const formatWindowLabel = (step: string, windowHours: number, timeZone: string, locale: string) =>
    formatPeriodLabel(toIsoMinute(addHours(new Date(step), -windowHours)), step, timeZone, locale)

// Dashed models keep their pattern here too (the palette's second encoding); round caps would close the gaps.
const ModelTick = ({ cx, cy, color, dash }: ModelTickProps) =>
    cx === undefined || cy === undefined ? null : (
        <line
            x1={cx - 7}
            x2={cx + 7}
            y1={cy}
            y2={cy}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dash}
            strokeLinecap={dash ? 'butt' : 'round'}
        />
    )

interface IProps {
    steps: string[]
    series: Series[]
    median: (number | null)[]
    chance: (number | null)[]
    timeZone: string
    locale: string
    windowHours?: number
    height?: number
}

export function PrecipPanel({
    steps,
    series,
    median,
    chance,
    timeZone,
    locale,
    windowHours = 6,
    height = 230,
}: IProps) {
    const t = useTranslations('city')
    const theme = useChartTheme()

    const { ref, width } = useElementWidth<HTMLDivElement>()

    const rows = toRows(steps, series, median, chance)
    // The axis covers every model's tick, not only the median bars, and uses the shared 0.5 / 1 / 2 / 5 mm steps.
    const yDomain = getYDomain([...median, ...series.flatMap((s) => s.values)], Variable.Precip)
    const yTicks = getYTicks(yDomain, Variable.Precip, 3)
    const dayStarts = getDayStarts(steps, timeZone)

    const TimeAndChanceTick = ({ x = 0, y = 0, index = 0 }: TickProps) => (
        <g transform={`translate(${x},${y})`}>
            <text dy={12} textAnchor="middle" fontSize={10} fill={theme.muted}>
                {formatTime(rows[index]?.step ?? steps[0], timeZone, locale, HOUR_FORMAT)}
            </text>
            <text dy={25} textAnchor="middle" fontSize={10} fontWeight={600} fill={theme.foreground}>
                {formatPercent(rows[index]?.chance)}
            </text>
        </g>
    )

    const renderTooltip = ({ active, payload }: TooltipContentProps) => {
        const row = active ? payload?.[0]?.payload : undefined

        if (!row) return null

        return (
            <div className="rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
                <div className="mb-1 text-muted-foreground">
                    {formatWindowLabel(row.step, windowHours, timeZone, locale)}
                </div>
                <div className="flex justify-between gap-4 font-semibold">
                    <span>{t('medianTotal')}</span>
                    <span>{formatNumber(row.median)} mm</span>
                </div>
                <div className="mb-1 flex justify-between gap-4">
                    <span>{t('chanceOfRain')}</span>
                    <span>{formatPercent(row.chance)}</span>
                </div>
                {series.map((s) => (
                    <div key={s.modelId} className="flex justify-between gap-4 text-muted-foreground">
                        <span>{MODEL_BY_ID[s.modelId].name}</span>
                        <span className="text-foreground">{formatNumber(row[s.modelId] as number | null)}</span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div ref={ref}>
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={theme.grid} />
                    <XAxis
                        dataKey="step"
                        tick={TimeAndChanceTick}
                        tickLine={false}
                        axisLine={{ stroke: theme.border }}
                        interval={width < MIN_WIDTH_PER_LABEL * steps.length ? 1 : 0}
                        height={36}
                    />
                    <YAxis
                        width={36}
                        domain={yDomain}
                        ticks={yTicks}
                        tickFormatter={(tick: number) => formatYTick(tick)}
                        tick={{ fontSize: 10, fill: theme.muted }}
                        tickLine={false}
                        axisLine={false}
                        allowDataOverflow
                    />
                    {dayStarts.map((step) => (
                        <ReferenceLine
                            key={step}
                            x={step}
                            position="start"
                            stroke={theme.border}
                            ifOverflow="extendDomain"
                        />
                    ))}
                    <Tooltip content={renderTooltip} cursor={{ fill: theme.grid, opacity: 0.6 }} />
                    <Bar
                        dataKey="median"
                        fill={theme.band}
                        fillOpacity={0.55}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        isAnimationActive={false}
                    />
                    {series.map((s) => (
                        <Scatter
                            key={s.modelId}
                            dataKey={s.modelId as ModelId}
                            isAnimationActive={false}
                            shape={(props: { cx?: number; cy?: number }) => (
                                <ModelTick
                                    cx={props.cx}
                                    cy={props.cy}
                                    color={MODEL_BY_ID[s.modelId].color}
                                    dash={MODEL_BY_ID[s.modelId].dash}
                                />
                            )}
                        />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}
