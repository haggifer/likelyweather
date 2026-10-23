import { useState } from 'react'
import { LayoutChangeEvent } from 'react-native'

export interface UseLayoutWidthResult {
    width: number
    onLayout: (e: LayoutChangeEvent) => void
}

export function useLayoutWidth(): UseLayoutWidthResult {
    const [width, setWidth] = useState(0)

    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

    return { width, onLayout }
}
