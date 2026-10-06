import { ReactNode } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

// Horizontal drags scrub the chart and a tap picks a slot, while a vertical drag still scrolls the page: the pan only
// starts after a few pixels sideways and gives up once the finger moves vertically first.
const START_OFFSET_X = 6
const FAIL_OFFSET_Y = 10

interface IProps {
    onScrub: (x: number) => void
    children: ReactNode
}

export function ScrubSurface({ onScrub, children }: IProps) {
    const pan = Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-START_OFFSET_X, START_OFFSET_X])
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onStart((e) => onScrub(e.x))
        .onUpdate((e) => onScrub(e.x))
    const tap = Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => onScrub(e.x))

    return <GestureDetector gesture={Gesture.Race(pan, tap)}>{children}</GestureDetector>
}
