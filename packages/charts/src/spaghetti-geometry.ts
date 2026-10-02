import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { ModelId } from '@fa/shared/models'
import { bisector } from 'd3-array'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { getTimeScale, getValueScale } from './plot-geometry'

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

type Values = (number | null)[]

type PlotScales = Pick<SpaghettiGeometry, 'x' | 'y' | 'times'>

const isDefined = (p: Point) => p[1] !== null

const toIndexedPoints = (values: Values): Point[] => values.map((v, i) => [i, v])

const getLinePath = ({ x, y, times }: PlotScales, values: Values) =>
    line<Point>()
        .defined(isDefined)
        .x((p) => x(times[p[0]]))
        .y((p) => y(p[1] as number))
        .curve(curveMonotoneX)(toIndexedPoints(values)) ?? ''

const getBandPath = ({ x, y, times }: PlotScales, lo: Values, hi: Values) =>
    area<number>()
        .defined((i) => lo[i] !== null && hi[i] !== null)
        .x((i) => x(times[i]))
        .y0((i) => y(lo[i] as number))
        .y1((i) => y(hi[i] as number))
        .curve(curveMonotoneX)(times.map((_, i) => i)) ?? ''

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
    const x = getTimeScale(times, [margin.left, width - margin.right])
    const y = getValueScale(domain, [height - margin.bottom, margin.top])
    const scales = { x, y, times }

    return {
        x,
        y,
        times,
        lines: series.map((s) => ({ modelId: s.modelId, d: getLinePath(scales, s.values) })),
        median: getLinePath(scales, stats.median),
        outerBand: getBandPath(scales, stats.min, stats.max),
        innerBand: getBandPath(scales, stats.q1, stats.q3),
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
