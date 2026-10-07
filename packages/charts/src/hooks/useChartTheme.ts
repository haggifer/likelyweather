import { subscribeColorMode } from '@fa/ui/lib/color-mode'
import { useSyncExternalStore } from 'react'
import { getChartThemeServerSnapshot, getChartThemeSnapshot } from '../chart-theme-store'
import { ChartTheme } from '../theme'

// D3 and Recharts read colors from the live CSS variables and re-render after every color mode switch.
export function useChartTheme(): ChartTheme {
    return useSyncExternalStore(subscribeColorMode, getChartThemeSnapshot, getChartThemeServerSnapshot)
}
