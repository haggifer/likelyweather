import { CHART_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { SkFont, useFont } from '@shopify/react-native-skia'
import { FONT_ASSETS } from '../theme/fonts'

export interface UseChartFontsResult {
    regular: SkFont | null
    semiBold: SkFont | null
}

// The chart labels' two weights of Inter at the chart's text size, for a Skia canvas; null until loaded.
export function useChartFonts(): UseChartFontsResult {
    const regular = useFont(FONT_ASSETS.Inter_400Regular, CHART_FONT_SIZE)
    const semiBold = useFont(FONT_ASSETS.Inter_600SemiBold, CHART_FONT_SIZE)

    return { regular, semiBold }
}
