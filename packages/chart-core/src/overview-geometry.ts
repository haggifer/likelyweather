import { HOUR_MS } from '@fa/shared/constants'
import { PanelVariable } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable } from '@fa/shared/variables'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { getPanelSeries, getSecondarySeries, getValueAt } from './overview-readouts'
import { MedianSeries, OverviewMedians } from './overview-stats'
import { getBarWidth, getTimeScale, getValueScale } from './plot-geometry'
import { getPanelTicks, getYDomain } from './scales'
import { getScrollWidth, MIN_ARCHIVE_HOUR_WIDTH, MIN_SLOT_WIDTH } from './scroll-geometry'
import { getSumBarCenter } from './spaghetti-geometry'

// A size of the overview's drawing: the panels' heights, the tick-label column and the hovered time's label.
export interface OverviewSize {
    heights: Record<PanelVariable, number>
    marginLeft: number
    hoverLabelHalfWidth: number
}

// A panel's box: `bottom` is its plot's baseline, above the strip of arrows or chances under it.
export interface PanelRow {
    variable: PanelVariable
    top: number
    bottom: number
    height: number
}

interface PanelSpan {
    top: number
    bottom: number
}

export interface OverviewLayout {
    rows: PanelRow[]
    spans: PanelSpan[]
    plotTop: number
    plotBottom: number
    totalHeight: number
}

export interface OverviewFrame {
    x: ScaleTime<number, number>
    stepMs: number
    plotRight: number
    plotWidth: number
    barWidth: number
    slotWidth: number
}

// A panel's value axis: the scale and the ticks its gridlines and its pinned labels share.
export interface PanelScale {
    y: ScaleLinear<number, number>
    ticks: number[]
}

export interface PanelPaths {
    area: string
    line: string
    // The dashed second line (feels-like, gusts), when the panel has one.
    secondary: string | null
}

export interface PanelBar {
    key: string
    x: number
    y: number
    width: number
    height: number
}

export interface ChanceLabel {
    key: string
    x: number
    text: string
    // Half the models or more: the label stands out.
    isLikely: boolean
}

export interface HoverDot {
    key: string
    cy: number
    isSecondary: boolean
}

type Point = [Date, number | null]

// The chance of rain sits under the precipitation bars like the direction arrows under the wind, a few pixels below the
// bars' baseline so its "%" clears the axis's 0; the panel grows by it, so the bars keep their room.
const CHANCE_GAP = 4
const CHANCE_STRIP = 18
const CHANCE_ROOM = CHANCE_GAP + CHANCE_STRIP
export const ROW_GAP = 14
const ROW_PAD = 6
const ARROW_STRIP = 20
export const HOVER_STRIP = 20
export const AXIS_HEIGHT = 22
export const OVERVIEW_MARGIN_RIGHT = 8
export const PANEL_RADIUS = 4
export const SECONDARY_DASH = '5 3'
const SLOT_MS = SLOT_HOURS * HOUR_MS
const LIKELY_CHANCE = 0.5

// The overview of the web's desktop column and of the app. Text is 11 px everywhere (author, 2026-10-12).
export const OVERVIEW_SIZE: OverviewSize = {
    heights: {
        [Variable.Temp]: 104,
        [Variable.Wind]: 100,
        [Variable.Pressure]: 80,
        [Variable.Precip]: 80,
        [Variable.Humidity]: 80,
        [Variable.Cloud]: 80,
    },
    marginLeft: 36,
    hoverLabelHalfWidth: 34,
}

const isDefined = (p: Point) => p[1] !== null

const getChanceRoom = (variable: PanelVariable, hasChance: boolean) =>
    variable === Variable.Precip && hasChance ? CHANCE_ROOM : 0

const getStripHeight = (variable: PanelVariable, hasChance: boolean) =>
    variable === Variable.Wind ? ARROW_STRIP : getChanceRoom(variable, hasChance)

export const getPanelHeight = (heights: OverviewSize['heights'], variable: PanelVariable, hasChance: boolean) =>
    heights[variable] + getChanceRoom(variable, hasChance)

const toRows = (heights: OverviewSize['heights'], panels: PanelVariable[], hasChance: boolean) =>
    panels.reduce<PanelRow[]>((rows, variable) => {
        const previous = rows[rows.length - 1]
        const top = previous ? previous.top + previous.height + ROW_GAP : HOVER_STRIP
        const height = getPanelHeight(heights, variable, hasChance)

        return [
            ...rows,
            { variable, top, height, bottom: top + height - ROW_PAD - getStripHeight(variable, hasChance) },
        ]
    }, [])

// The reader's panels stacked in their order (`overview-panels.ts`), the hover time strip above the first and the day
// labels under the last, whichever they are.
export const getOverviewLayout = (
    heights: OverviewSize['heights'],
    panels: PanelVariable[],
    hasChance: boolean,
): OverviewLayout => {
    const rows = toRows(heights, panels, hasChance)
    const last = rows[rows.length - 1]
    const plotBottom = last ? last.top + last.height : HOVER_STRIP

    return {
        rows,
        spans: rows.map(({ top, height }) => ({ top, bottom: top + height })),
        plotTop: rows[0]?.top ?? HOVER_STRIP,
        plotBottom,
        totalHeight: plotBottom + AXIS_HEIGHT,
    }
}

// The middle of the strips under a panel's baseline.
export const getChanceY = (bottom: number) => bottom + CHANCE_GAP + CHANCE_STRIP / 2

export const getArrowY = (bottom: number) => bottom + ARROW_STRIP / 2 + 2

// The forecast steps every 3-hour slot; the archive's past weather every hour, narrower.
export const getOverviewStepMs = (isArchive: boolean) => (isArchive ? HOUR_MS : SLOT_MS)

export const getOverviewContentWidth = (width: number, steps: number, marginLeft: number, isArchive: boolean) =>
    getScrollWidth(
        width,
        steps - 1,
        isArchive ? MIN_ARCHIVE_HOUR_WIDTH : MIN_SLOT_WIDTH,
        marginLeft + OVERVIEW_MARGIN_RIGHT,
    )

// The time axis across the whole scrollable drawing, and the sizes that follow from it.
export const getOverviewFrame = (
    times: Date[],
    marginLeft: number,
    contentWidth: number,
    isArchive: boolean,
): OverviewFrame => {
    const stepMs = getOverviewStepMs(isArchive)
    const plotRight = contentWidth - OVERVIEW_MARGIN_RIGHT
    const plotWidth = Math.max(0, plotRight - marginLeft)
    const x = getTimeScale(times, [marginLeft, Math.max(marginLeft + 1, plotRight)])
    const slotWidth = times.length > 1 ? x(times[1]) - x(times[0]) : plotWidth

    return { x, stepMs, plotRight, plotWidth, barWidth: getBarWidth(x, times[0], stepMs), slotWidth }
}

// Gusts outrun the mean wind, so a wind panel showing them takes the gusts' axis steps.
const getPanelDomain = (variable: PanelVariable, s: MedianSeries, secondary: MedianSeries | null) => {
    const hasSecondary = secondary !== null && secondary.values.some((v) => v !== null)
    const scaleVariable = hasSecondary && variable === Variable.Wind ? Variable.Gusts : variable
    const values = hasSecondary ? [...s.values, ...secondary.values] : s.values

    return { domain: getYDomain(values, scaleVariable), scaleVariable }
}

export const getPanelScale = (row: PanelRow, series: OverviewMedians): PanelScale => {
    const s = getPanelSeries(series, row.variable)
    const { domain, scaleVariable } = getPanelDomain(row.variable, s, getSecondarySeries(series, row.variable))

    return { y: getValueScale(domain, [row.bottom, row.top + ROW_PAD]), ticks: getPanelTicks(domain, scaleVariable) }
}

const toPoints = (s: MedianSeries): Point[] => s.steps.map((step, i) => [new Date(step), s.values[i]])

const getAreaPath = (points: Point[], x: ScaleTime<number, number>, y: ScaleLinear<number, number>, bottom: number) =>
    area<Point>()
        .defined(isDefined)
        .x((p) => x(p[0]))
        .y0(bottom)
        .y1((p) => y(p[1] as number))
        .curve(curveMonotoneX)(points) ?? ''

const getLinePath = (points: Point[], x: ScaleTime<number, number>, y: ScaleLinear<number, number>) =>
    line<Point>()
        .defined(isDefined)
        .x((p) => x(p[0]))
        .y((p) => y(p[1] as number))
        .curve(curveMonotoneX)(points) ?? ''

// A line panel's median as a shaded area under its line, and its dashed second line.
export const getPanelPaths = (
    { variable, bottom }: PanelRow,
    series: OverviewMedians,
    x: ScaleTime<number, number>,
    y: ScaleLinear<number, number>,
): PanelPaths => {
    const points = toPoints(getPanelSeries(series, variable))
    const secondary = getSecondarySeries(series, variable)

    return {
        area: getAreaPath(points, x, y, bottom),
        line: getLinePath(points, x, y),
        secondary: secondary && getLinePath(toPoints(secondary), x, y),
    }
}

// A precipitation bar is the amount of the step after its slot; bars that would overflow the plot are not drawn.
export const getPanelBars = (
    { variable, bottom }: PanelRow,
    series: OverviewMedians,
    x: ScaleTime<number, number>,
    y: ScaleLinear<number, number>,
    { stepMs, barWidth, plotRight }: OverviewFrame,
) =>
    toPoints(getPanelSeries(series, variable)).flatMap(([time, value]): PanelBar[] => {
        const center = x(getSumBarCenter(time, stepMs))

        if (value === null || center + barWidth / 2 > plotRight) return []

        return [
            {
                key: time.toISOString(),
                x: center - barWidth / 2,
                y: y(value),
                width: barWidth,
                height: Math.max(0, bottom - y(value)),
            },
        ]
    })

// The share of models above 0.2 mm under each precipitation bar, in percent; the unit stands once in the pinned tick
// column. Every slot is wide enough for its label.
export const getChanceLabels = (
    chance: (number | null)[],
    times: Date[],
    x: ScaleTime<number, number>,
    { stepMs, barWidth, plotRight }: OverviewFrame,
) =>
    chance.flatMap((c, i): ChanceLabel[] => {
        const center = x(getSumBarCenter(times[i], stepMs))

        if (c === null || center + barWidth / 2 > plotRight) return []

        return [
            { key: times[i].toISOString(), x: center, text: String(Math.round(c * 100)), isLikely: c >= LIKELY_CHANCE },
        ]
    })

const toDots = (key: string, value: number | null | undefined, y: ScaleLinear<number, number>, isSecondary = false) =>
    value === null || value === undefined ? [] : [{ key, cy: y(value), isSecondary }]

// The selected slot's median on every line panel, and the dashed second line's value where a panel has one.
export const getHoverDots = (rows: PanelRow[], scales: PanelScale[], series: OverviewMedians, step: string) =>
    rows.flatMap(({ variable }, i): HoverDot[] => {
        if (variable === Variable.Precip) return []

        const secondary = getSecondarySeries(series, variable)
        const value = getValueAt(getPanelSeries(series, variable), step)

        return [
            ...toDots(variable, value, scales[i].y),
            ...toDots(`${variable}-secondary`, secondary && getValueAt(secondary, step), scales[i].y, true),
        ]
    })
