import { ScaleTime } from 'd3-scale'
import { PointerEvent } from 'react'

// The overlay rect starts at the left margin, so the pointer offset inside it is shifted back onto the x range.
export const getPointerTime = (e: PointerEvent<Element>, x: ScaleTime<number, number>, left: number) =>
    x.invert(e.clientX - e.currentTarget.getBoundingClientRect().left + left)
