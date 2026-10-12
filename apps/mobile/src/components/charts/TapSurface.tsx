import { ReactNode } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { isInsidePlot, PlotRect } from './plot-area'

// A finger that moves further than this is scrolling, not tapping.
const MAX_TAP_DISTANCE = 10

interface IProps {
    onSelect: (x: number) => void
    // With a plot, only a tap on it selects; a tap on the axes or day labels around it calls `onClear`. A selection
    // stays after the finger lifts, so its readout can be read, as on the web's touch screens.
    plot?: PlotRect
    onClear?: () => void
    children: ReactNode
}

// A tap picks a slot; a drag scrolls the chart sideways or the page up and down.
export function TapSurface({ onSelect, plot, onClear, children }: IProps) {
    const tap = Gesture.Tap()
        .runOnJS(true)
        .maxDistance(MAX_TAP_DISTANCE)
        .onEnd((e) => (!plot || isInsidePlot(e.x, e.y, plot) ? onSelect(e.x) : onClear?.()))

    return <GestureDetector gesture={tap}>{children}</GestureDetector>
}
