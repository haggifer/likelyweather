import { Text as NativeText, StyleSheet, TextProps } from 'react-native'
import { getFontFamily } from '../../theme/fonts'

const styles = StyleSheet.create({
    // The web sets tabular figures on the whole page, so readouts keep their width while the finger scrubs.
    text: { fontVariant: ['tabular-nums'] },
})

type IProps = TextProps

// React Native's Text in the web's Inter. The weight goes into the family name, and `fontWeight` is reset so Android
// does not embolden a bold file a second time.
export function Text({ style, ...props }: IProps) {
    const fontFamily = getFontFamily(StyleSheet.flatten(style)?.fontWeight)

    return <NativeText {...props} style={[styles.text, style, { fontFamily, fontWeight: 'normal' }]} />
}
