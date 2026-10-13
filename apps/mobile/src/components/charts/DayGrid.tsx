import { getDayLabels } from '@fa/chart-core/day-labels'
import { CHART_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { getLocalMidnights } from '@fa/shared/format'
import { ScaleTime } from 'd3-scale'
import { useMemo } from 'react'
import { G, Line, Text } from 'react-native-svg'
import { getFontFamily } from '../../theme/fonts'

interface Span {
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
    labelY: number
    lineColor: string
    labelColor: string
    fontSize?: number
}

// Local midnights of the city in every panel, with each day's label centred in its span ("Sat 26 Sept", "Sat 26",
// "Sat", whichever fits), as on the web.
export function DayGrid({
    x,
    start,
    end,
    timeZone,
    locale,
    spans,
    labelY,
    lineColor,
    labelColor,
    fontSize = CHART_FONT_SIZE,
}: IProps) {
    const midnights = useMemo(() => getLocalMidnights(start, end, timeZone), [start, end, timeZone])
    const labels = getDayLabels(midnights, { x, start, end, timeZone, locale, fontSize })

    return (
        <G>
            {midnights.map((m) =>
                spans.map((span) => (
                    <Line
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
            {labels.map((d) => (
                <Text
                    key={d.key}
                    x={d.x}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontFamily={getFontFamily('400')}
                    fill={labelColor}
                >
                    {d.text}
                </Text>
            ))}
        </G>
    )
}
