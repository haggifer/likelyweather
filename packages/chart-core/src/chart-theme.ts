// The colours every chart draws with in both apps, and the design token each one reads: the web reads the CSS
// variable of that name, the app the generated token of the same name.
export interface ChartColors {
    foreground: string
    muted: string
    border: string
    card: string
    grid: string
    median: string
    band: string
}

export interface ChartTheme extends ChartColors {
    bandOpacity: number
}

type ColorKey = keyof ChartColors

const CHART_COLOR_TOKENS = {
    foreground: 'foreground',
    muted: 'muted-foreground',
    border: 'border',
    card: 'card',
    grid: 'chart-grid',
    median: 'chart-median',
    band: 'chart-band',
} as const satisfies Record<ColorKey, string>

type ChartColorToken = (typeof CHART_COLOR_TOKENS)[ColorKey]

type ColorReader = (token: ChartColorToken, key: ColorKey) => string

// `--band-opacity` in globals.css, equal in both colour modes.
export const BAND_OPACITY = 0.12

const readColor = (read: ColorReader, key: ColorKey) => read(CHART_COLOR_TOKENS[key], key)

export const getChartColors = (read: ColorReader): ChartColors => ({
    foreground: readColor(read, 'foreground'),
    muted: readColor(read, 'muted'),
    border: readColor(read, 'border'),
    card: readColor(read, 'card'),
    grid: readColor(read, 'grid'),
    median: readColor(read, 'median'),
    band: readColor(read, 'band'),
})
