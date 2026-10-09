import { useSyncExternalStore } from 'react'
import { AccessibilityInfo } from 'react-native'

let isReduced = false

const subscribe = (onChange: () => void) => {
    const update = (value: boolean) => {
        isReduced = value
        onChange()
    }
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update)

    void AccessibilityInfo.isReduceMotionEnabled().then(update)

    return () => subscription.remove()
}

const getSnapshot = () => isReduced

// Android's "Remove animations": pulses, fades and tweens stand still while it is on, like the web's
// prefers-reduced-motion.
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot)
}
