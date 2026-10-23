import { useFonts } from 'expo-font'
import { FONT_ASSETS } from '../theme/fonts'

// A font that fails to load counts as ready, so the system font stays in place rather than a blank screen.
export function useAppFonts(): boolean {
    const [isLoaded, error] = useFonts(FONT_ASSETS)

    return isLoaded || Boolean(error)
}
