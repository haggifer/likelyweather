import { ActivityIndicator, View } from 'react-native'
import { Text } from './text'

interface IProps {
    label: string
}

// The web's role="status" with its spinner: TalkBack reads the text when it appears or changes, without moving focus
// to it.
export function LoadingStatus({ label }: IProps) {
    return (
        <View
            className="flex-row items-center gap-2"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={label}
        >
            <ActivityIndicator size="small" colorClassName="accent-muted-foreground" />
            <Text className="text-sm text-muted-foreground">{label}</Text>
        </View>
    )
}
