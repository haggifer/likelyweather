import {
    BAND_INNER_OPACITY,
    BAND_OUTER_OPACITY,
    getChartColors,
    ChartTheme as SharedChartTheme,
} from '@fa/chart-core/chart-theme'

// The colours both apps' charts draw with, and the ones only the web's draw with.
export interface ChartTheme extends SharedChartTheme {
    primary: string
    warning: string
    fontMono: string
}

// Server snapshot and first client render: the light tokens in globals.css.
export const FALLBACK_CHART_THEME: ChartTheme = {
    foreground: '#0b1b33',
    muted: '#4a5a73',
    border: '#dce3ee',
    card: '#ffffff',
    grid: '#e6ebf3',
    median: '#0b1b33',
    band: '#1e5eff',
    primary: '#1e5eff',
    warning: '#b45309',
    bandOuterOpacity: BAND_OUTER_OPACITY,
    bandInnerOpacity: BAND_INNER_OPACITY,
    fontMono: 'ui-monospace, monospace',
}

export const readChartTheme = (): ChartTheme => {
    const el = document.documentElement
    const style = getComputedStyle(el)
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
    const readNumber = (name: string, fallback: number) => Number(read(name, String(fallback))) || fallback

    return {
        ...getChartColors((token, key) => read(`--${token}`, FALLBACK_CHART_THEME[key])),
        primary: read('--primary', FALLBACK_CHART_THEME.primary),
        warning: read('--warning', FALLBACK_CHART_THEME.warning),
        bandOuterOpacity: readNumber('--band-outer-opacity', FALLBACK_CHART_THEME.bandOuterOpacity),
        bandInnerOpacity: readNumber('--band-inner-opacity', FALLBACK_CHART_THEME.bandInnerOpacity),
        fontMono: read('--font-mono', FALLBACK_CHART_THEME.fontMono),
    }
}
