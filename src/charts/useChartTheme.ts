import { ChartTheme, FALLBACK_CHART_THEME, readChartTheme } from '@/charts/theme'
import { THEME_CHANGE_EVENT } from '@/theme/apply'
import { useSyncExternalStore } from 'react'

let snapshot: ChartTheme | null = null

const subscribe = (onChange: () => void) => {
    const handleChange = () => {
        snapshot = null
        onChange()
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleChange)
}

const getSnapshot = () => (snapshot ??= readChartTheme())

const getServerSnapshot = () => FALLBACK_CHART_THEME

// D3 and Recharts read colors from the live CSS variables and re-render on every `themechange` event.
export default function useChartTheme(): ChartTheme {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
