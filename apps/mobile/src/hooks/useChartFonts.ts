import { CHART_FONT_SIZE, PANEL_NAME_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { SkFont, useFont } from '@shopify/react-native-skia'
import { FONT_ASSETS } from '../theme/fonts'

export interface UseChartFontsResult {
    regular: SkFont | null
    semiBold: SkFont | null
    panelName: SkFont | null
}

export function useChartFonts(): UseChartFontsResult {
    const regular = useFont(FONT_ASSETS.Inter_400Regular, CHART_FONT_SIZE)
    const semiBold = useFont(FONT_ASSETS.Inter_600SemiBold, CHART_FONT_SIZE)
    const panelName = useFont(FONT_ASSETS.Inter_600SemiBold, PANEL_NAME_FONT_SIZE)

    return { regular, semiBold, panelName }
}
