import { getChartThemeServerSnapshot, getChartThemeSnapshot } from '@/components/charts/chart-theme-store'
import { ChartTheme } from '@/components/charts/theme'
import { subscribeColorMode } from '@/lib/color-mode'
import { useSyncExternalStore } from 'react'

// D3 and Recharts read colors from the live CSS variables and re-render after every color mode switch.
export function useChartTheme(): ChartTheme {
    return useSyncExternalStore(subscribeColorMode, getChartThemeSnapshot, getChartThemeServerSnapshot)
}
