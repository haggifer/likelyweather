import { DayLabelStyle, formatDayLabel } from '@fa/shared/format'
import { ScaleTime } from 'd3-scale'

export interface DayLabel {
    key: string
    x: number
    text: string
}

interface DayLabelInput {
    x: ScaleTime<number, number>
    start: Date
    end: Date
    timeZone: string
    locale: string
    fontSize: number
}

// Average glyph width of the chart font as a share of its size, and the space kept between neighbouring labels.
const CHAR_WIDTH_EM = 0.6
const LABEL_GAP = 8
const STYLES: DayLabelStyle[] = ['long', 'short', 'narrow']

export const getDayLabel = (iso: string, width: number, timeZone: string, locale: string, fontSize: number) =>
    STYLES.map((style) => formatDayLabel(iso, timeZone, locale, style)).find(
        (label) => label.length * fontSize * CHAR_WIDTH_EM + LABEL_GAP <= width,
    ) ?? null

// Each local day's label, centred in its span of time between `start`, the local midnights and `end`, in the longest
// form that fits; a day too narrow for any form gets none.
export const getDayLabels = (midnights: Date[], { x, start, end, timeZone, locale, fontSize }: DayLabelInput) =>
    [start, ...midnights].flatMap((from, i, all): DayLabel[] => {
        const to = all[i + 1] ?? end
        const text = getDayLabel(from.toISOString(), x(to) - x(from), timeZone, locale, fontSize)

        return text ? [{ key: from.toISOString(), x: (x(from) + x(to)) / 2, text }] : []
    })
