import { ActivityIndicator, View } from 'react-native'
import { Text } from './text'

interface IProps {
    label: string
    // The web shows some statuses as the spinner alone (the archive card's title); TalkBack still reads the label.
    isLabelShown?: boolean
}

// The web's role="status" with its spinner: TalkBack reads the text when it appears or changes, without moving focus
// to it.
export function LoadingStatus({ label, isLabelShown = true }: IProps) {
    return (
        <View
            className="flex-row items-center gap-2"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={label}
        >
            <ActivityIndicator size="small" colorClassName="accent-muted-foreground" />
            {isLabelShown && <Text className="text-sm text-muted-foreground">{label}</Text>}
        </View>
    )
}
