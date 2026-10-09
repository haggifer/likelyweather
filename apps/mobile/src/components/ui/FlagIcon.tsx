import * as FLAGS from 'country-flag-icons/string/3x2'
import { StyleSheet, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { useTheme } from '../../hooks/useTheme'

const FLAG_SVGS: Record<string, string | undefined> = FLAGS
const ASPECT = 3 / 2

const styles = StyleSheet.create({
    frame: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, overflow: 'hidden' },
})

interface IProps {
    countryCode: string
    width?: number
}

// The web's flag assets, drawn from the same package, so a flag looks the same on every phone. The name next to it
// says the country, so the flag stays out of TalkBack's reading.
export function FlagIcon({ countryCode, width = 18 }: IProps) {
    const { colors } = useTheme()

    const xml = FLAG_SVGS[countryCode.toUpperCase()]
    const height = width / ASPECT

    if (!xml) return null

    return (
        <View
            testID={`flag-${countryCode.toUpperCase()}`}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.frame, { width, height, borderColor: colors.border }]}
        >
            <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </View>
    )
}
