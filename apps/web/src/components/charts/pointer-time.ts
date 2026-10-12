import { ScaleTime } from 'd3-scale'
import { MouseEvent } from 'react'

// The overlay rect starts at the left margin, so the pointer offset inside it is shifted back onto the x range. Its
// box moves with a scrolled chart, so the offset holds at any scroll position.
export const getPointerTime = (e: MouseEvent<Element>, x: ScaleTime<number, number>, left: number) =>
    x.invert(e.clientX - e.currentTarget.getBoundingClientRect().left + left)
