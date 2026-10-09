import { ReactNode } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { getPlotHitSlop, isInsidePlot, PlotArea } from './plot-area'

// Horizontal drags scrub the chart and a tap picks a slot, while a vertical drag still scrolls the page: the pan only
// starts after a few pixels sideways and gives up once the finger moves vertically first.
const START_OFFSET_X = 6
const FAIL_OFFSET_Y = 10

interface IProps {
    onScrub: (x: number) => void
    // With an area, only its plot takes scrubs, not the axes and day labels around it, and a tap outside the plot
    // calls `onClear`. A selection stays after the finger lifts, so its readout can be read, as on the web's touch
    // screens.
    area?: PlotArea
    onClear?: () => void
    children: ReactNode
}

export function ScrubSurface({ onScrub, area, onClear, children }: IProps) {
    const pan = Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-START_OFFSET_X, START_OFFSET_X])
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onStart((e) => onScrub(e.x))
        .onUpdate((e) => onScrub(e.x))
    const tap = Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => (!area || isInsidePlot(e.x, e.y, area.plot) ? onScrub(e.x) : onClear?.()))

    if (area) pan.hitSlop(getPlotHitSlop(area))

    return <GestureDetector gesture={Gesture.Race(pan, tap)}>{children}</GestureDetector>
}
