import { scaleLinear, ScaleTime, scaleUtc } from 'd3-scale'

const BAR_RATIO = 0.62

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const getTimeScale = (times: Date[], range: [number, number]) =>
    scaleUtc()
        .domain([times[0], times[times.length - 1]])
        .range(range)

export const getValueScale = (domain: [number, number], range: [number, number]) =>
    scaleLinear().domain(domain).range(range)

export const getNowX = (x: ScaleTime<number, number>, now: Date | null, left: number, right: number) =>
    now ? clamp(x(now), left, right) : null

export const getBarWidth = (x: ScaleTime<number, number>, start: Date, stepMs: number) =>
    Math.max(2, (x(new Date(start.getTime() + stepMs)) - x(start)) * BAR_RATIO)
