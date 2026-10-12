import { ComponentRef, RefObject, useEffect, useRef } from 'react'
import { ScrollView } from 'react-native-gesture-handler'

export interface UseChartScrollResult {
    ref: RefObject<ComponentRef<typeof ScrollView> | null>
    onContentSizeChange: () => void
}

// A chart wider than the screen opens at now, and a new `resetKey` (another run or city) opens it there again;
// anything else, such as another variable, keeps the reader's place. The first placement waits for the content's
// size, since a scroll view ignores an offset past content it has not laid out yet.
export function useChartScroll(resetKey: string, initialScrollLeft: number): UseChartScrollResult {
    const ref = useRef<ComponentRef<typeof ScrollView>>(null)
    const placedKey = useRef<string | null>(null)

    const place = () => {
        placedKey.current = resetKey
        ref.current?.scrollTo({ x: initialScrollLeft, animated: false })
    }
    const onContentSizeChange = () => {
        if (placedKey.current !== resetKey) place()
    }

    useEffect(() => {
        if (placedKey.current !== null && placedKey.current !== resetKey) place()
        // The offset moves with every tick of `now`; only a new key moves the view.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey])

    return { ref, onContentSizeChange }
}
