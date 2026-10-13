import { Series } from '@fa/shared/api'
import { formatPeriodLabel, formatStepLabel } from '@fa/shared/format'
import { ModelId } from '@fa/shared/models'
import { ScaleTime } from 'd3-scale'
import { getLabelX } from './scroll-geometry'
import { DrawnBar, getSumBarCenter, getSumSpan, Margin } from './spaghetti-geometry'

export interface TooltipRow {
    modelId: ModelId
    value: number
}

// The hovered span's shade, across the plot.
interface Shade {
    left: number
    width: number
}

export interface SpaghettiHover {
    index: number
    x: number
    label: string
    labelX: number
    // A sum is hovered as the period it covers: shaded across, labelled with its start and end.
    shade: Shade | null
    // The hovered precipitation bar, drawn again over the static one.
    bar: DrawnBar | undefined
}

interface HoverInput {
    hoverIndex: number | null
    steps: string[]
    times: Date[]
    x: ScaleTime<number, number>
    isBars: boolean
    stepMs: number
    bars: DrawnBar[]
    // The part of the plot on screen when the step was picked (`getVisibleRange`).
    visibleRange: [number, number]
    margin: Margin
    plotRight: number
    timeZone: string
    locale: string
}

const HOVER_LABEL_HALF_WIDTH = 34
const PERIOD_LABEL_HALF_WIDTH = 50
// The unit over the pinned axis, which the hovered time's label keeps clear of.
export const UNIT_LABEL_WIDTH = 28

export const getHoverLabel = (step: string, span: [Date, Date] | null, timeZone: string, locale: string) =>
    span
        ? formatPeriodLabel(span[0].toISOString(), span[1].toISOString(), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

// Every model with a value at the step, highest first.
export const getTooltipRows = (series: Series[], index: number) =>
    series
        .map((s) => ({ modelId: s.modelId, value: s.values[index] }))
        .filter((r): r is TooltipRow => r.value !== null)
        .sort((a, b) => b.value - a.value)

const getShade = ([start, end]: [Date, Date], x: ScaleTime<number, number>, left: number, right: number): Shade => {
    const from = Math.max(left, x(start))

    return { left: from, width: Math.max(0, Math.min(right, x(end)) - from) }
}

// Where the hovered step's crosshair, label and shade go; null when nothing (or a step past the data) is hovered.
export const getSpaghettiHover = ({
    hoverIndex,
    steps,
    times,
    x,
    isBars,
    stepMs,
    bars,
    visibleRange: [visibleLeft, visibleRight],
    margin,
    plotRight,
    timeZone,
    locale,
}: HoverInput): SpaghettiHover | null => {
    if (hoverIndex === null || !times[hoverIndex]) return null

    const span = isBars ? getSumSpan(times[hoverIndex], stepMs) : null
    const hoverX = x(span ? getSumBarCenter(times[hoverIndex], stepMs) : times[hoverIndex])
    const halfWidth = span ? PERIOD_LABEL_HALF_WIDTH : HOVER_LABEL_HALF_WIDTH

    return {
        index: hoverIndex,
        x: hoverX,
        label: getHoverLabel(steps[hoverIndex], span, timeZone, locale),
        labelX: getLabelX(hoverX, [visibleLeft + UNIT_LABEL_WIDTH, visibleRight], halfWidth),
        shade: span && getShade(span, x, margin.left, plotRight),
        bar: bars.find(({ i }) => i === hoverIndex),
    }
}
