'use client'

import { useScrollLeft } from '@/hooks/useScrollLeft'
import { getLabelWidth } from '@fa/chart-core/day-labels'
import { getNowLabelStart, LABEL_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { RefObject } from 'react'

interface IProps {
    scrollRef: RefObject<HTMLElement | null>
    nowX: number
    // The pinned axis's width: the scroller's offset plus it is the plot's visible left edge, in the drawing's x.
    insetLeft: number
    y: number
    text: string
    color: string
}

// Centred over the now line, but held clear of the pinned axis, which a label centred on a line near the plot's left
// edge would slide under. No CSS can tie an SVG label to the scroll offset, so the offset is read here, and only this
// label re-renders as the chart scrolls.
export function NowLabel({ scrollRef, nowX, insetLeft, y, text, color }: IProps) {
    const scrollLeft = useScrollLeft(scrollRef)

    const width = getLabelWidth(text, LABEL_FONT_SIZE)
    const start = getNowLabelStart(nowX, width, scrollLeft + insetLeft)
    const isCentred = start === nowX - width / 2

    return (
        <text
            x={isCentred ? nowX : start}
            y={y}
            textAnchor={isCentred ? 'middle' : 'start'}
            fontSize={LABEL_FONT_SIZE}
            fontWeight={600}
            fill={color}
            pointerEvents="none"
        >
            {text}
        </text>
    )
}
