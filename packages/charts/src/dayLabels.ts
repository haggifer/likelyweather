import { DayLabelStyle, formatDayLabel } from '@fa/shared/format'

// Average glyph width of the chart font as a share of its size, and the space kept between neighbouring labels.
const CHAR_WIDTH_EM = 0.6
const LABEL_GAP = 8
const STYLES: DayLabelStyle[] = ['long', 'short', 'narrow']

export const getDayLabel = (iso: string, width: number, timeZone: string, locale: string, fontSize: number) =>
    STYLES.map((style) => formatDayLabel(iso, timeZone, locale, style)).find(
        (label) => label.length * fontSize * CHAR_WIDTH_EM + LABEL_GAP <= width,
    ) ?? null
