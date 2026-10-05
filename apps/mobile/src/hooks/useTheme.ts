import { useColorScheme } from 'react-native'
import { DARK, LIGHT, RADIUS } from '../theme/tokens'

export interface Theme {
    colors: Record<keyof typeof LIGHT, string>
    radius: number
    isDark: boolean
}

export function useTheme(): Theme {
    const isDark = useColorScheme() === 'dark'

    return { colors: isDark ? DARK : LIGHT, radius: RADIUS, isDark }
}
