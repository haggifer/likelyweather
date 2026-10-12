import { FocusEvent, useState } from 'react'

export interface UseFocusVisibleResult {
    isFocusVisible: boolean
    onFocus: (e: FocusEvent<Element>) => void
    onBlur: () => void
}

// Whether an element has keyboard focus, for a ring drawn on a frame around it. A scrolled chart would clip a ring on
// itself, and a `:has(:focus-visible)` selector on the frame made every hover's style recalculation several times
// slower (each change inside the chart re-tests it).
export function useFocusVisible(): UseFocusVisibleResult {
    const [isFocusVisible, setIsFocusVisible] = useState(false)

    const onFocus = (e: FocusEvent<Element>) => setIsFocusVisible(e.currentTarget.matches(':focus-visible'))
    const onBlur = () => setIsFocusVisible(false)

    return { isFocusVisible, onFocus, onBlur }
}
