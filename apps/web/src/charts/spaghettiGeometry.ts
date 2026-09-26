import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { ModelId } from '@fa/shared/models'
import { bisector } from 'd3-array'
import { scaleLinear, ScaleLinear, ScaleTime, scaleUtc } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'

export interface Margin {
    top: number
    right: number
    bottom: number
    left: number
}

export interface SpaghettiGeometry {
    x: ScaleTime<number, number>
    y: ScaleLinear<number, number>
    times: Date[]
    lines: { modelId: ModelId; d: string }[]
    median: string
    outerBand: string
    innerBand: string
}

interface GeometryInput {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    width: number
    height: number
    domain: [number, number]
    margin: Margin
}

type Point = [number, number | null]

const isDefined = (p: Point) => p[1] !== null

export const buildSpaghettiGeometry = ({
    steps,
    series,
    stats,
    width,
    height,
    domain,
    margin,
}: GeometryInput): SpaghettiGeometry => {
    const times = steps.map((s) => new Date(s))
    const x = scaleUtc()
        .domain([times[0], times[times.length - 1]])
        .range([margin.left, width - margin.right])
    const y = scaleLinear()
        .domain(domain)
        .range([height - margin.bottom, margin.top])
    const toLine = line<Point>()
        .defined(isDefined)
        .x((p) => x(times[p[0]]))
        .y((p) => y(p[1] as number))
        .curve(curveMonotoneX)
    const toBand = (lo: (number | null)[], hi: (number | null)[]) =>
        area<number>()
            .defined((i) => lo[i] !== null && hi[i] !== null)
            .x((i) => x(times[i]))
            .y0((i) => y(lo[i] as number))
            .y1((i) => y(hi[i] as number))
            .curve(curveMonotoneX)(times.map((_, i) => i)) ?? ''
    const indexed = (values: (number | null)[]): Point[] => values.map((v, i) => [i, v])

    return {
        x,
        y,
        times,
        lines: series.map((s) => ({ modelId: s.modelId, d: toLine(indexed(s.values)) ?? '' })),
        median: toLine(indexed(stats.median)) ?? '',
        outerBand: toBand(stats.min, stats.max),
        innerBand: toBand(stats.q1, stats.q3),
    }
}

// A sum (precipitation) covers the step after its slot, and its bar is centered in that span.
export const getSumBarCenter = (time: Date, stepMs: number) => new Date(time.getTime() + stepMs / 2)

export const getSumSpan = (time: Date, stepMs: number): [Date, Date] => [time, new Date(time.getTime() + stepMs)]

const timeBisector = bisector<Date, Date>((d) => d)

export const getNearestIndex = (times: Date[], at: Date) => {
    const i = timeBisector.center(times, at)

    return Math.max(0, Math.min(times.length - 1, i))
}

// The sum whose span contains `at`, so the pointer selects the bar it is over rather than the nearest step, which
// sits on the bar's edge.
export const getSpanIndex = (times: Date[], at: Date, stepMs: number) =>
    getNearestIndex(times, new Date(at.getTime() - stepMs / 2))
