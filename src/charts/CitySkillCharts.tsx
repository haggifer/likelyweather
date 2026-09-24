'use client'

import useChartTheme from '@/charts/useChartTheme'
import { formatNumber, formatSigned } from '@/lib/format'
import { useTranslations } from 'next-intl'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

interface BiasProps {
    data: { day: string; bias: number | null; n: number }[]
    color: string
    unit: string
}

interface ErrorByLeadProps {
    data: { leadBucket: number; mae: number | null; n: number }[]
    color: string
    unit: string
}

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6 }

export const BiasOverTimeChart = ({ data, color, unit }: BiasProps) => {
    const t = useTranslations('model')
    const theme = useChartTheme()

    return (
        <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fill: theme.muted }}
                    tickLine={false}
                    minTickGap={24}
                    tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 9, fill: theme.muted }} tickLine={false} axisLine={false} width={40} />
                <ReferenceLine y={0} stroke={theme.muted} />
                <Tooltip
                    contentStyle={{
                        ...TOOLTIP_STYLE,
                        background: theme.card,
                        borderColor: theme.border,
                        color: theme.foreground,
                    }}
                    formatter={(v) => [`${formatSigned(Number(v))} ${unit}`, t('bias')]}
                />
                <Line
                    type="monotone"
                    dataKey="bias"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

export const ErrorByLeadChart = ({ data, color, unit }: ErrorByLeadProps) => {
    const t = useTranslations('model')
    const theme = useChartTheme()

    return (
        <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis
                    dataKey="leadBucket"
                    tick={{ fontSize: 9, fill: theme.muted }}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}h`}
                />
                <YAxis tick={{ fontSize: 9, fill: theme.muted }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                    cursor={{ fill: theme.grid }}
                    contentStyle={{
                        ...TOOLTIP_STYLE,
                        background: theme.card,
                        borderColor: theme.border,
                        color: theme.foreground,
                    }}
                    formatter={(v) => [`${formatNumber(Number(v), 2)} ${unit}`, t('mae')]}
                    labelFormatter={(v) => t('leadHours', { hours: Number(v) })}
                />
                <Bar dataKey="mae" fill={color} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    )
}
