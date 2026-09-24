'use client'

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

interface IProps {
    values: (number | null)[]
    color: string
    width?: number
    height?: number
    label: string
}

export default function Sparkline({ values, color, width = 96, height = 26, label }: IProps) {
    const data = values.map((value, i) => ({ i, value }))

    return (
        <div style={{ width, height }} role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
