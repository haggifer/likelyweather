import { ColorMode, getColorMode } from '@fa/ui/lib/color-mode'
import { ChartTheme, FALLBACK_CHART_THEME, readChartTheme } from './theme'

interface Snapshot {
    mode: ColorMode
    theme: ChartTheme
}

let snapshot: Snapshot | null = null

// The theme is cached per colour mode and re-read when the `.dark` class differs from the cached mode, so a switch
// made on a page without charts (nothing subscribed) is picked up when a chart mounts again.
export const getChartThemeSnapshot = (): ChartTheme => {
    const mode = getColorMode()

    if (snapshot?.mode !== mode) snapshot = { mode, theme: readChartTheme() }

    return snapshot.theme
}

export const getChartThemeServerSnapshot = () => FALLBACK_CHART_THEME
