import { useEffect, useState } from 'react'
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'

// Tailwind's animate-pulse: half opacity and back over two seconds.
const PULSE_MS = 1000
const PULSE_OPACITY = 0.5
const PULSE_EASING = Easing.bezier(0.4, 0, 0.6, 1)

const getPulse = (opacity: Animated.Value) =>
    Animated.loop(
        Animated.sequence([
            Animated.timing(opacity, {
                toValue: PULSE_OPACITY,
                duration: PULSE_MS,
                easing: PULSE_EASING,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, easing: PULSE_EASING, useNativeDriver: true }),
        ]),
    )

interface IProps {
    // Optional for a block sized by its style, such as one stretched over a line of text.
    height?: number
    width?: number | `${number}%`
    radius?: number
    style?: StyleProp<ViewStyle>
}

export function Skeleton({ height, width = '100%', radius, style }: IProps) {
    const { colors, radius: baseRadius } = useTheme()
    const isReducedMotion = useReducedMotion()

    const [opacity] = useState(() => new Animated.Value(1))

    useEffect(() => {
        if (isReducedMotion) return

        const pulse = getPulse(opacity)

        pulse.start()

        return () => {
            pulse.stop()
            opacity.setValue(1)
        }
    }, [isReducedMotion, opacity])

    return (
        <Animated.View
            style={[
                { height, width, borderRadius: radius ?? baseRadius * 0.6, backgroundColor: colors.muted, opacity },
                style,
            ]}
        />
    )
}
