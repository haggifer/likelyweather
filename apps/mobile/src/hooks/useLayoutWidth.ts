import { useState } from 'react'
import { LayoutChangeEvent } from 'react-native'

export interface UseLayoutWidthResult {
    width: number
    onLayout: (e: LayoutChangeEvent) => void
}

// A chart's width comes from its container's layout; before the first layout nothing is drawn.
export function useLayoutWidth(): UseLayoutWidthResult {
    const [width, setWidth] = useState(0)

    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

    return { width, onLayout }
}
