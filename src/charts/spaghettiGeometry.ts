import { Series } from '@/shared/api'
import { EnsembleStats } from '@/shared/ensemble'
import { ModelId } from '@/shared/models'
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

const PAD_RATIO = 0.08

export const getYDomain = (series: Series[], zeroBased: boolean): [number, number] => {
    const values = series.flatMap((s) => s.values).filter((v): v is number => v !== null)

    if (!values.length) return [0, 1]

    const lo = zeroBased ? 0 : Math.min(...values)
    const hi = Math.max(...values)
    const pad = (hi - lo || 1) * PAD_RATIO
    const nice = scaleLinear()
        .domain([zeroBased ? 0 : lo - pad, hi + pad])
        .nice(8)
        .domain()

    return [nice[0], nice[1]]
}

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

const timeBisector = bisector<Date, Date>((d) => d)

export const getNearestIndex = (times: Date[], at: Date) => {
    const i = timeBisector.center(times, at)

    return Math.max(0, Math.min(times.length - 1, i))
}
