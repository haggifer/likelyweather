import * as React from 'react'
import { View } from 'react-native'
import Animated, {
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'
import { cn } from '../../lib/cn'

const PULSE_MS = 1000

// The web's `animate-pulse rounded-md bg-muted`; it holds still when the reader turns animations off.
function Skeleton({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
    const opacity = useSharedValue(1)

    const style = useAnimatedStyle(() => ({ opacity: opacity.get() }))

    React.useEffect(() => {
        opacity.set(withRepeat(withTiming(0.5, { duration: PULSE_MS, reduceMotion: ReduceMotion.System }), -1, true))
    }, [opacity])

    return <Animated.View style={style} className={cn('rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
