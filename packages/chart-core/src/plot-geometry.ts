import { scaleLinear, ScaleTime, scaleUtc } from 'd3-scale'

const BAR_RATIO = 0.62

export const CHART_FONT_SIZE = 11
// The overview's panel names on phones ("Temperature, °C").
export const PANEL_NAME_FONT_SIZE = 14
// The value axis's numbers and the chance of rain's "%" beside them, the chance of rain's values, and the label over
// the plot: "now", or the picked slot's time that replaces it.
export const LABEL_FONT_SIZE = 12

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const getTimeScale = (times: Date[], range: [number, number]) =>
    scaleUtc()
        .domain([times[0], times[times.length - 1]])
        .range(range)

export const getValueScale = (domain: [number, number], range: [number, number]) =>
    scaleLinear().domain(domain).range(range)

export const getNowX = (x: ScaleTime<number, number>, now: Date | null, left: number, right: number) =>
    now ? clamp(x(now), left, right) : null

// Where a "now" label centred over its line starts, so the pinned axis never covers it: against the plot's visible left
// edge while the line is near it, then starting at the line as the line itself scrolls under the axis. The app calls
// it on the UI thread for every scroll frame, hence the worklet.
export const getNowLabelStart = (nowX: number, labelWidth: number, visibleLeft: number) => {
    'worklet'
    return Math.max(nowX - labelWidth / 2, Math.min(visibleLeft, nowX))
}

export const getBarWidth = (x: ScaleTime<number, number>, start: Date, stepMs: number) =>
    Math.max(2, (x(new Date(start.getTime() + stepMs)) - x(start)) * BAR_RATIO)
