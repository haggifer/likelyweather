import { HoverDot } from '@fa/chart-core/overview-geometry'

export interface OverviewSelection {
    x: number
    // The time label's centre, clamped to the part of the chart on screen.
    labelX: number
    label: string
    dots: HoverDot[]
}
