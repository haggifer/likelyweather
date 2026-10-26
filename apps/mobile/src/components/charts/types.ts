import { HoverDot } from '@fa/chart-core/overview-geometry'

export interface OverviewSelection {
    x: number
    // The time label's centre, clamped to the part of the chart on screen.
    labelX: number
    label: string
    dots: HoverDot[]
}

// A row of a table whose columns are time slots: a label and one cell per slot.
export interface TimeTableRow {
    key: string
    label: string
    isBold?: boolean
    cells: string[]
}
