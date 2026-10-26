import { Series } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { EnsembleStats } from '@fa/shared/ensemble'
import { hasSeriesValues } from '@fa/shared/has-values'
import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { bisector } from 'd3-array'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { clamp, getTimeScale, getValueScale } from './plot-geometry'
import { getYDomain, getYTicks } from './scales'

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
    rangeBand: string
}

// A precipitation bar that fits the plot, by its step's index and its centre.
export interface DrawnBar {
    i: number
    center: number
}

export interface ClipRect {
    x: number
    y: number
    width: number
    height: number
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

export const DEFAULT_SPAGHETTI_HEIGHT = 340
// The row of wind arrows under the plot.
const ARROW_ROW = 26
const MAX_TICK_WIDTH = 16
// The clip reaches past the plot by half the median's 3 px stroke and a pixel more, so a line on the axis's top or
// bottom value (a humidity or cloud cover of 100 %) shows its whole stroke.
const CLIP_BLEED = 2.5
export const BAR_OPACITY = 0.6
// The selected bar is drawn again over its static copy, which together reach the 0.95 of a selected bar.
export const SELECTED_BAR_OPACITY = 0.875
// Phones get a shorter plot so the model list under it stays in view while scrubbing.
const NARROW_WIDTH = 480
const NARROW_HEIGHT = 280
const DEFAULT_STEP_MS = 3 * HOUR_MS

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
        rangeBand: getBandPath(scales, stats.min, stats.max),
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

export const getSpaghettiMargin = (compact: boolean, hasArrows: boolean): Margin => ({
    top: compact ? 14 : 24,
    right: 12,
    bottom: (compact ? 22 : 30) + (hasArrows ? ARROW_ROW : 0),
    left: compact ? 40 : 44,
})

export const getSpaghettiHeight = (width: number, height: number) =>
    width < NARROW_WIDTH ? Math.min(height, NARROW_HEIGHT) : height

export const getArrowRowY = (height: number) => height - ARROW_ROW / 2 - 2

export const getSeriesYDomain = (series: Series[], variable: Variable) =>
    getYDomain(
        series.flatMap((s) => s.values),
        variable,
    )

// A chart without values (every model hidden, or none delivered) keeps its gridless frame: ticks on the fallback domain
// would label an empty axis with numbers, such as 0, 0, 0, 1, 1, 1 for whole hectopascals.
export const getSpaghettiTicks = (series: Series[], domain: [number, number], variable: Variable, count: number) =>
    hasSeriesValues(series) ? getYTicks(domain, variable, count) : []

export const getStepMs = (times: Date[]) =>
    times.length > 1 ? times[1].getTime() - times[0].getTime() : DEFAULT_STEP_MS

// Each model's amount is a tick across its bar, no wider than this.
export const getTickWidth = (barWidth: number) => Math.min(barWidth, MAX_TICK_WIDTH)

export const getDrawnBars = (
    times: Date[],
    x: ScaleTime<number, number>,
    stepMs: number,
    barWidth: number,
    [left, right]: [number, number],
): DrawnBar[] =>
    times
        .map((time, i) => ({ i, center: x(getSumBarCenter(time, stepMs)) }))
        .filter(({ center }) => center - barWidth / 2 >= left && center + barWidth / 2 <= right)

// Hovering and stepping stay within the drawn bars.
export const getIndexRange = (bars: DrawnBar[], isBars: boolean, count: number): [number, number] =>
    isBars && bars.length ? [bars[0].i, bars[bars.length - 1].i] : [0, count - 1]

export const getIndexAt = (times: Date[], at: Date, stepMs: number, isBars: boolean) =>
    isBars ? getSpanIndex(times, at, stepMs) : getNearestIndex(times, at)

export const getPickedIndex = (
    times: Date[],
    at: Date,
    stepMs: number,
    isBars: boolean,
    [min, max]: [number, number],
) => clamp(getIndexAt(times, at, stepMs, isBars), min, max)

// The bands span every model while the y-domain fits the visible ones, so they are clipped to the plot.
export const getClipRect = (margin: Margin, plotRight: number, plotBottom: number): ClipRect => ({
    x: margin.left,
    y: margin.top - CLIP_BLEED,
    width: Math.max(0, plotRight - margin.left),
    height: Math.max(0, plotBottom - margin.top + 2 * CLIP_BLEED),
})
