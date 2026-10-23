import { View } from 'react-native'
import { Text } from '../ui/text'

interface IProps {
    message: string
}

// The web's NoDataOverlay: over a chart or its table with no value to show. The frame stays under it, so its legend can
// still turn models back on and the controls around it still change the period.
export function NoDataOverlay({ message }: IProps) {
    return (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center p-4">
            <View className="rounded-md bg-background/80 px-3 py-2">
                <Text className="text-center text-sm text-muted-foreground" accessibilityLiveRegion="polite">
                    {message}
                </Text>
            </View>
        </View>
    )
}
