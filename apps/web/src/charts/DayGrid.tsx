import { formatDayLabel, getLocalMidnights } from '@/lib/format'
import { ScaleTime } from 'd3-scale'
import { useMemo } from 'react'

export interface Span {
    top: number
    bottom: number
}

interface IProps {
    x: ScaleTime<number, number>
    start: Date
    end: Date
    timeZone: string
    locale: string
    spans: Span[]
    labelYs: number[]
    lineColor: string
    labelColor: string
    minLabelWidth?: number
    fontSize?: number
}

// Day boundaries are drawn at local midnight of the city in every span (one per panel), with each day's label
// centered in its span of time at every label row.
export default function DayGrid({
    x,
    start,
    end,
    timeZone,
    locale,
    spans,
    labelYs,
    lineColor,
    labelColor,
    minLabelWidth = 64,
    fontSize = 11,
}: IProps) {
    const midnights = useMemo(() => getLocalMidnights(start, end, timeZone), [start, end, timeZone])
    const labels = [start, ...midnights]
        .map((from, i, all) => {
            const to = all[i + 1] ?? end
            return { key: from.toISOString(), x: (x(from) + x(to)) / 2, width: x(to) - x(from), from }
        })
        .filter((d) => d.width > minLabelWidth)

    return (
        <g aria-hidden="true">
            {midnights.map((m) =>
                spans.map((span) => (
                    <line
                        key={`${m.toISOString()}-${span.top}`}
                        x1={x(m)}
                        x2={x(m)}
                        y1={span.top}
                        y2={span.bottom}
                        stroke={lineColor}
                        strokeWidth={1}
                    />
                )),
            )}
            {labelYs.map((labelY) =>
                labels.map((d) => (
                    <text
                        key={`${d.key}-${labelY}`}
                        x={d.x}
                        y={labelY}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fill={labelColor}
                    >
                        {formatDayLabel(d.from.toISOString(), timeZone, locale)}
                    </text>
                )),
            )}
        </g>
    )
}
