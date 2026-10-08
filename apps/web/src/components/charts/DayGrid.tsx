import { getDayLabel } from '@fa/chart-core/day-labels'
import { getLocalMidnights } from '@fa/shared/format'
import { ScaleTime } from 'd3-scale'
import { useMemo } from 'react'

interface Span {
    top: number
    bottom: number
}

interface DayLabel {
    key: string
    x: number
    text: string
}

type DayLabelInput = Pick<IProps, 'x' | 'start' | 'end' | 'timeZone' | 'locale'> & { fontSize: number }

const getDayLabels = (midnights: Date[], { x, start, end, timeZone, locale, fontSize }: DayLabelInput): DayLabel[] =>
    [start, ...midnights].flatMap((from, i, all) => {
        const to = all[i + 1] ?? end
        const text = getDayLabel(from.toISOString(), x(to) - x(from), timeZone, locale, fontSize)

        return text ? [{ key: from.toISOString(), x: (x(from) + x(to)) / 2, text }] : []
    })

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
    fontSize?: number
}

// Day boundaries are drawn at local midnight of the city in every span (one per panel), with each day's label
// centered in its span of time at every label row, as long as the space allows ("Sat 26 Sept", "Sat 26", "Sat").
export function DayGrid({
    x,
    start,
    end,
    timeZone,
    locale,
    spans,
    labelYs,
    lineColor,
    labelColor,
    fontSize = 11,
}: IProps) {
    const midnights = useMemo(() => getLocalMidnights(start, end, timeZone), [start, end, timeZone])
    const labels = getDayLabels(midnights, { x, start, end, timeZone, locale, fontSize })

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
                        {d.text}
                    </text>
                )),
            )}
        </g>
    )
}
