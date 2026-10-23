import { getDayLabels } from '@fa/chart-core/day-labels'
import { CHART_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { getLocalMidnights } from '@fa/shared/format'
import { Group, Line, SkFont, vec } from '@shopify/react-native-skia'
import { ScaleTime } from 'd3-scale'
import { useMemo } from 'react'
import { CanvasText } from './CanvasText'

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
    font: SkFont | null
}

// Local midnights of the city in every panel, with each day's label centred in its span.
export function CanvasDayGrid({ x, start, end, timeZone, locale, spans, labelY, lineColor, labelColor, font }: IProps) {
    const midnights = useMemo(() => getLocalMidnights(start, end, timeZone), [start, end, timeZone])
    const labels = getDayLabels(midnights, { x, start, end, timeZone, locale, fontSize: CHART_FONT_SIZE })

    return (
        <Group>
            {midnights.map((m) =>
                spans.map((span) => (
                    <Line
                        key={`${m.toISOString()}-${span.top}`}
                        p1={vec(x(m), span.top)}
                        p2={vec(x(m), span.bottom)}
                        color={lineColor}
                        style="stroke"
                        strokeWidth={1}
                    />
                )),
            )}
            {labels.map((d) => (
                <CanvasText
                    key={d.key}
                    font={font}
                    text={d.text}
                    x={d.x}
                    y={labelY}
                    color={labelColor}
                    anchor="middle"
                />
            ))}
        </Group>
    )
}
