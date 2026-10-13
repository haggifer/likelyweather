import { ScaleTime } from 'd3-scale'

export interface WindMark {
    key: string
    x: number
    // Where the wind comes from, or null for a slot without a direction, drawn as a dot.
    deg: number | null
}

// An arrow pointing up from its centre.
export const WIND_ARROW_PATH = 'M0,-7 L4,3 L0,1 L-4,3 Z'
export const WIND_DOT_RADIUS = 1.5

export const getWindMarks = (x: ScaleTime<number, number>, times: Date[], directions: (number | null)[]) =>
    directions.map((deg, i): WindMark => ({ key: times[i].toISOString(), x: x(times[i]), deg }))

// Meteorological direction is where the wind comes from; the arrow points where it blows to (+180°).
export const getWindTransform = (x: number, y: number, deg: number) => `translate(${x},${y}) rotate(${deg + 180})`
