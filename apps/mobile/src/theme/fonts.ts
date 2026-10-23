import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold'
import { TextStyle } from 'react-native'

// The web's typefaces: Inter, and Lexend for the logo. Each weight is its own file: the package root would bundle
// all of them.
export const FONT_ASSETS = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Lexend_600SemiBold }

type FontFamily = keyof typeof FONT_ASSETS

// The web's `font-logo` at `font-semibold`.
export const LOGO_FONT_FAMILY: FontFamily = 'Lexend_600SemiBold'

const FAMILY_BY_WEIGHT: Record<string, FontFamily> = {
    '500': 'Inter_500Medium',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
    bold: 'Inter_700Bold',
    '800': 'Inter_700Bold',
    '900': 'Inter_700Bold',
}

// Android picks a loaded font by its family name, not by `fontWeight`, so every weight names its own file.
export const getFontFamily = (weight: TextStyle['fontWeight']): FontFamily =>
    FAMILY_BY_WEIGHT[String(weight ?? '400')] ?? 'Inter_400Regular'
