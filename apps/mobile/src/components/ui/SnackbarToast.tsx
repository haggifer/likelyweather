import { View } from 'react-native'
import type { SnackbarAction } from '../../lib/snackbar-store'
import { Button } from './button'
import { Text } from './text'

interface IProps {
    message: string
    actions: SnackbarAction[]
    onAction: (action: SnackbarAction) => void
}

// The web's toast, drawn by sonner-native over every screen. Its wrapper announces a new message to TalkBack without
// moving focus.
export function SnackbarToast({ message, actions, onAction }: IProps) {
    return (
        <View className="mx-4 flex-row flex-wrap items-center gap-x-2 rounded-lg border border-border bg-popover py-1.5 pr-2 pl-4 shadow-lg shadow-black/20">
            <Text className="shrink grow basis-3/5 py-2 text-sm text-popover-foreground">{message}</Text>
            {actions.length > 0 && (
                <View className="ml-auto flex-row">
                    {actions.map((action) => (
                        <Button key={action.label} variant="ghost" className="px-2.5" onPress={() => onAction(action)}>
                            <Text className="font-semibold text-primary">{action.label}</Text>
                        </Button>
                    ))}
                </View>
            )}
        </View>
    )
}
