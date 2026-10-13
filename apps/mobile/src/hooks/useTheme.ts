import { ChartTheme } from '@fa/chart-core/chart-theme'
import { useColorScheme } from 'react-native'
import { getChartTheme } from '../theme/chart-theme'
import { DARK, LIGHT, RADIUS } from '../theme/tokens'
import { useSettings } from './useSettings'

export interface Theme {
    colors: Record<keyof typeof LIGHT, string>
    chart: ChartTheme
    radius: number
    isDark: boolean
}

const LIGHT_CHART = getChartTheme(LIGHT)
const DARK_CHART = getChartTheme(DARK)

// The app's setting wins; "system" follows the device.
export function useTheme(): Theme {
    const scheme = useColorScheme()
    const { theme } = useSettings()

    const isDark = theme === 'dark' || (theme === 'system' && scheme === 'dark')

    return { colors: isDark ? DARK : LIGHT, chart: isDark ? DARK_CHART : LIGHT_CHART, radius: RADIUS, isDark }
}
