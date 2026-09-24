export interface ChartTheme {
    foreground: string
    muted: string
    border: string
    card: string
    grid: string
    median: string
    band: string
    primary: string
    warning: string
    bandOuterOpacity: number
    bandInnerOpacity: number
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
    bandOuterOpacity: 0.12,
    bandInnerOpacity: 0.22,
    fontMono: 'ui-monospace, monospace',
}

export const readChartTheme = (): ChartTheme => {
    const el = document.documentElement
    const style = getComputedStyle(el)
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
    const readNumber = (name: string, fallback: number) => Number(read(name, String(fallback))) || fallback

    return {
        foreground: read('--foreground', FALLBACK_CHART_THEME.foreground),
        muted: read('--muted-foreground', FALLBACK_CHART_THEME.muted),
        border: read('--border', FALLBACK_CHART_THEME.border),
        card: read('--card', FALLBACK_CHART_THEME.card),
        grid: read('--chart-grid', FALLBACK_CHART_THEME.grid),
        median: read('--chart-median', FALLBACK_CHART_THEME.median),
        band: read('--chart-band', FALLBACK_CHART_THEME.band),
        primary: read('--primary', FALLBACK_CHART_THEME.primary),
        warning: read('--warning', FALLBACK_CHART_THEME.warning),
        bandOuterOpacity: readNumber('--band-outer-opacity', FALLBACK_CHART_THEME.bandOuterOpacity),
        bandInnerOpacity: readNumber('--band-inner-opacity', FALLBACK_CHART_THEME.bandInnerOpacity),
        fontMono: read('--font-mono', FALLBACK_CHART_THEME.fontMono),
    }
}
