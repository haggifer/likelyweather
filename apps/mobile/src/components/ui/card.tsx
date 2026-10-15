import { View } from 'react-native'
import { cn } from '../../lib/cn'
import { Text, TextClassContext } from './text'

function Card({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
    return (
        // The web card's text size, and its frame from globals.css (`[data-slot='card']`): the 10 px radius, the border
        // and `--shadow-card`, which the theme generator brings over.
        <TextClassContext.Provider value="text-sm text-card-foreground">
            <View
                className={cn(
                    // The web card's spacing (--card-spacing, 16 px).
                    'bg-card border-border shadow-card flex flex-col gap-4 rounded-lg border py-4',
                    className,
                )}
                {...props}
            />
        </TextClassContext.Provider>
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
    return <View className={cn('flex flex-col gap-1 px-4', className)} {...props} />
}

function CardTitle({ className, ref, ...props }: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
    return (
        <Text
            ref={ref}
            role="heading"
            aria-level={3}
            className={cn('text-base leading-snug font-medium', className)}
            {...props}
        />
    )
}

function CardDescription({
    className,
    ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
    return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
    return <View className={cn('px-4', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
