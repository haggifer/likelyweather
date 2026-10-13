import { Text as NativeText, StyleSheet, TextProps } from 'react-native'
import { getFontFamily } from '../../theme/fonts'

const styles = StyleSheet.create({
    tabular: { fontVariant: ['tabular-nums'] },
})

interface IProps extends TextProps {
    // Figures of one width, so a readout keeps its width while the finger scrubs. Only for numbers: Inter's tabular
    // forms also widen hyphens, which spaces out words like "Open-Meteo".
    isTabular?: boolean
}

// React Native's Text in the web's Inter. The weight goes into the family name, and `fontWeight` is reset so Android
// does not embolden a bold file a second time.
export function Text({ style, isTabular = false, ...props }: IProps) {
    const fontFamily = getFontFamily(StyleSheet.flatten(style)?.fontWeight)

    return <NativeText {...props} style={[isTabular && styles.tabular, style, { fontFamily, fontWeight: 'normal' }]} />
}
