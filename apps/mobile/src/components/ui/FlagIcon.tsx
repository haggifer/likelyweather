import * as FLAGS from 'country-flag-icons/string/3x2'
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'

const FLAG_SVGS: Record<string, string | undefined> = FLAGS
const ASPECT = 3 / 2
// The web's `ring-1`: a frame outside the flag, which takes no room, so the artwork keeps its full size.
const FRAME = 1

interface IProps {
    countryCode: string
    width?: number
}

// The web's flag assets, drawn from the same package, so a flag looks the same on every phone. The name next to it
// says the country, so the flag stays out of TalkBack's reading.
export function FlagIcon({ countryCode, width = 18 }: IProps) {
    const xml = FLAG_SVGS[countryCode.toUpperCase()]
    const height = width / ASPECT

    if (!xml) return null

    return (
        <View
            testID={`flag-${countryCode.toUpperCase()}`}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            className="overflow-hidden rounded-[0.1875rem] border border-border"
            style={{ width: width + 2 * FRAME, height: height + 2 * FRAME, margin: -FRAME }}
        >
            <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </View>
    )
}
