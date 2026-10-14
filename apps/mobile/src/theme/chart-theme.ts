import { BAND_OPACITY, ChartTheme, getChartColors } from '@fa/chart-core/chart-theme'
import { LIGHT } from './tokens'

type Colors = Record<keyof typeof LIGHT, string>

// The tokens the web charts read from their CSS variables.
export const getChartTheme = (colors: Colors): ChartTheme => ({
    ...getChartColors((token) => colors[token]),
    bandOpacity: BAND_OPACITY,
})
