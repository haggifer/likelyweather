import { CloudSun } from 'lucide-react-native'
import { View } from 'react-native'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

const BRAND = 'Forecast Arena'
const WORD = 'text-[0.9375rem] leading-4 font-bold tracking-tight'

// The web top bar's brand: the cloud-sun logo and the name on two lines.
export function Wordmark() {
    return (
        <View className="flex-row items-center gap-2" accessible role="heading" aria-label={BRAND}>
            <Icon as={CloudSun} strokeWidth={1.75} className="size-8 text-primary" />
            <View>
                <Text className={WORD}>Forecast</Text>
                <Text className={WORD}>Arena</Text>
            </View>
        </View>
    )
}
