import { OctagonX } from 'lucide-react-native'
import { View } from 'react-native'
import { cn } from '../../lib/cn'
import type { SnackbarAction } from '../../lib/snackbar-store'
import { Button } from './button'
import { Icon } from './icon'
import { Text } from './text'

interface IProps {
    message: string
    actions: SnackbarAction[]
    isError?: boolean
    onAction: (action: SnackbarAction) => void
}

// sonner's toast shadow on the web; set as a style, which takes the comma-separated colour as it is.
const TOAST_STYLE = { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }

// The web's toast (sonner there, sonner-native here, drawn over every screen): 16 px padding, a 13 px title and, for an
// error, the octagon icon. As in sonner, the last action is the filled one and an earlier one the quieter cancel. Its
// wrapper announces a new message to TalkBack without moving focus.
export function SnackbarToast({ message, actions, isError = false, onAction }: IProps) {
    return (
        <View
            className="mx-4 flex-row flex-wrap items-center gap-1.5 rounded-lg border border-border bg-popover p-4"
            style={TOAST_STYLE}
        >
            {isError && <Icon as={OctagonX} className="size-4 text-popover-foreground" />}
            <Text className="shrink grow basis-3/5 text-[0.8125rem] leading-normal font-medium text-popover-foreground">
                {message}
            </Text>
            {actions.length > 0 && (
                <View className="ml-auto flex-row gap-1.5">
                    {actions.map((action, i) => {
                        const isMain = i === actions.length - 1

                        return (
                            <Button
                                key={action.label}
                                onPress={() => onAction(action)}
                                className={cn(
                                    'h-9 rounded-sm px-3',
                                    isMain ? 'bg-foreground' : 'bg-black/8 dark:bg-white/30',
                                )}
                            >
                                <Text
                                    className={cn('text-xs font-medium', isMain ? 'text-popover' : 'text-foreground')}
                                >
                                    {action.label}
                                </Text>
                            </Button>
                        )
                    })}
                </View>
            )}
        </View>
    )
}
