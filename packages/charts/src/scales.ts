import { formatNumber } from '@fa/shared/format'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { range } from 'd3-array'
import { scaleLinear } from 'd3-scale'

const PAD_RATIO = 0.06
const MAX_SEGMENTS = 3
const EPSILON = 1e-9

const pickTickStep = (steps: number[], max: number) =>
    steps.find((step) => Math.ceil(max / step - EPSILON) <= MAX_SEGMENTS) ?? steps[steps.length - 1]

// Y domain for a variable: snapped outward to the variable's gridline step (5 °C, 2 m/s), zero-based with the
// smallest step from `tickSteps` that covers the maximum in at most three segments (precipitation), or padded
// and niced.
export const getYDomain = (values: (number | null | undefined)[], variable: Variable): [number, number] => {
    const { tickStep, tickSteps, nonNegative } = VARIABLE_BY_ID[variable]
    const defined = values.filter((v): v is number => v !== null && v !== undefined)
    const zeroBased = variable === Variable.Precip

    if (tickSteps) {
        const max = Math.max(0, ...defined)
        const step = pickTickStep(tickSteps, max)

        return [0, Math.max(step, Math.ceil(max / step - EPSILON) * step)]
    }

    if (!defined.length) return [0, tickStep ?? 1]

    const min = zeroBased ? 0 : Math.min(...defined)
    const max = Math.max(...defined)

    if (tickStep) {
        const lo = Math.floor(min / tickStep) * tickStep
        const hi = Math.ceil(max / tickStep) * tickStep
        return [nonNegative ? Math.max(0, lo) : lo, hi > lo ? hi : lo + tickStep]
    }

    const pad = (max - min || 1) * PAD_RATIO
    const lo = zeroBased ? 0 : min - pad
    const hi = max + pad

    const [niceLo, niceHi] = scaleLinear().domain([lo, hi]).nice(6).domain()

    return [nonNegative ? Math.max(0, niceLo) : niceLo, niceHi]
}

export const getYTicks = (domain: [number, number], variable: Variable, count: number) => {
    const { tickSteps } = VARIABLE_BY_ID[variable]
    const tickStep = tickSteps ? pickTickStep(tickSteps, domain[1]) : VARIABLE_BY_ID[variable].tickStep

    if (!tickStep) return scaleLinear().domain(domain).ticks(count)

    return range(Math.ceil(domain[0] / tickStep) * tickStep, domain[1] + tickStep / 2, tickStep)
}

export const formatYTick = (tick: number, isWhole = false) =>
    formatNumber(tick, isWhole || Number.isInteger(tick) ? 0 : 1)
