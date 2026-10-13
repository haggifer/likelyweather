import { BAND_INNER_OPACITY, BAND_OUTER_OPACITY, ChartTheme, getChartColors } from '@fa/chart-core/chart-theme'
import { LIGHT } from './tokens'

type Colors = Record<keyof typeof LIGHT, string>

// The tokens the web charts read from their CSS variables.
export const getChartTheme = (colors: Colors): ChartTheme => ({
    ...getChartColors((token) => colors[token]),
    bandOuterOpacity: BAND_OUTER_OPACITY,
    bandInnerOpacity: BAND_INNER_OPACITY,
})
