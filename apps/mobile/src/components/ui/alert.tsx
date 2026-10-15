import type { LucideIcon } from 'lucide-react-native'
import * as React from 'react'
import { View } from 'react-native'
import { cn } from '../../lib/cn'
import { Icon } from './icon'
import { Text, TextClassContext } from './text'

function Alert({
    className,
    variant,
    children,
    icon,
    iconClassName,
    ...props
}: React.ComponentProps<typeof View> &
    React.RefAttributes<View> & {
        icon: LucideIcon
        variant?: 'default' | 'destructive'
        iconClassName?: string
    }) {
    return (
        <TextClassContext.Provider
            value={cn('text-sm text-foreground', variant === 'destructive' && 'text-destructive')}
        >
            {/* The web's alert: 10 px sides, 8 px top and bottom, the icon in the first 16 px column and the text 8 px
                after it. */}
            <View
                role="alert"
                className={cn('bg-card border-border relative w-full gap-0.5 rounded-lg border px-2.5 py-2', className)}
                {...props}
            >
                <View className="absolute left-2.5 top-2.5">
                    <Icon
                        as={icon}
                        className={cn('size-4', variant === 'destructive' && 'text-destructive', iconClassName)}
                    />
                </View>
                {children}
            </View>
        </TextClassContext.Provider>
    )
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
    const textClass = React.useContext(TextClassContext)
    return (
        <Text
            className={cn(
                'text-muted-foreground pl-6 text-sm',
                textClass?.includes('text-destructive') && 'text-destructive/90',
                className,
            )}
            {...props}
        />
    )
}

export { Alert, AlertDescription }
