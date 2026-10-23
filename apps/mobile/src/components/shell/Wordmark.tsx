import { CloudSun } from 'lucide-react-native'
import { View } from 'react-native'
import { LOGO_FONT_FAMILY } from '../../theme/fonts'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

const BRAND = 'Likely Weather'
const WORD = 'text-[1rem] leading-[1.02rem] tracking-tight'
const WORD_STYLE = { fontFamily: LOGO_FONT_FAMILY }

// The web top bar's brand: the cloud-sun logo and the name on two lines.
export function Wordmark() {
    return (
        <View className="flex-row items-center gap-2" accessible role="heading" aria-label={BRAND}>
            <Icon as={CloudSun} strokeWidth={1.75} className="size-8 text-primary" />
            <View>
                <Text className={WORD} style={WORD_STYLE}>
                    likely
                </Text>
                <Text className={WORD} style={WORD_STYLE}>
                    weather
                </Text>
            </View>
        </View>
    )
}
