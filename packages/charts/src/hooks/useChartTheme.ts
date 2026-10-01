import { COLOR_MODE_EVENT } from '@fa/ui/lib/color-mode'
import { useSyncExternalStore } from 'react'
import { ChartTheme, FALLBACK_CHART_THEME, readChartTheme } from '../theme'

let snapshot: ChartTheme | null = null

const subscribe = (onChange: () => void) => {
    const handleChange = () => {
        snapshot = null
        onChange()
    }

    window.addEventListener(COLOR_MODE_EVENT, handleChange)
    return () => window.removeEventListener(COLOR_MODE_EVENT, handleChange)
}

const getSnapshot = () => (snapshot ??= readChartTheme())

const getServerSnapshot = () => FALLBACK_CHART_THEME

// D3 and Recharts read colors from the live CSS variables and re-render after every color mode switch.
export function useChartTheme(): ChartTheme {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
