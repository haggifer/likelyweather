import { useFonts } from 'expo-font'
import { FONT_ASSETS } from '../theme/fonts'

// True once Inter is ready; a font that fails to load leaves the system font in place rather than a blank screen.
export function useAppFonts(): boolean {
    const [isLoaded, error] = useFonts(FONT_ASSETS)

    return isLoaded || Boolean(error)
}
