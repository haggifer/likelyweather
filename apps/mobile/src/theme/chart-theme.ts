import { LIGHT } from './tokens'

type Colors = Record<keyof typeof LIGHT, string>

export interface ChartTheme {
    foreground: string
    muted: string
    border: string
    card: string
    grid: string
    median: string
    band: string
    bandOuterOpacity: number
    bandInnerOpacity: number
}

// The same CSS variables the web charts read (`--band-outer-opacity` and `--band-inner-opacity` are equal in both
// modes, so they are constants here).
export const getChartTheme = (colors: Colors): ChartTheme => ({
    foreground: colors.foreground,
    muted: colors['muted-foreground'],
    border: colors.border,
    card: colors.card,
    grid: colors['chart-grid'],
    median: colors['chart-median'],
    band: colors['chart-band'],
    bandOuterOpacity: 0.12,
    bandInnerOpacity: 0.22,
})
