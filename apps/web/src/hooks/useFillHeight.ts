import { RefObject, useLayoutEffect } from 'react'

const MIN_HEIGHT_REM = 27
const MAX_WINDOW_SHARE = 0.7
// From `sm` up; phones keep the element's own cap.
const WIDE_QUERY = '(min-width: 40rem)'

const getRemPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize)

// The tallest allowed height first, then whatever the page overflows the window by is given back, so the element takes
// the page's free space without making it scroll; never below 27rem, never above 70% of the window.
const fitHeight = (element: HTMLElement) => {
    if (!matchMedia(WIDE_QUERY).matches) {
        element.style.height = ''

        return
    }

    const min = MIN_HEIGHT_REM * getRemPx()
    const max = Math.max(min, MAX_WINDOW_SHARE * innerHeight)

    element.style.height = `${max}px`

    const overflow = document.documentElement.scrollHeight - innerHeight

    element.style.height = `${Math.min(max, Math.max(min, max - overflow))}px`
}

// Sizes a scrolling element to the window's free height from `sm` up, again on every resize.
export function useFillHeight(ref: RefObject<HTMLElement | null>): void {
    useLayoutEffect(() => {
        const element = ref.current

        if (!element) return

        const handleResize = () => fitHeight(element)

        handleResize()
        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [ref])
}
