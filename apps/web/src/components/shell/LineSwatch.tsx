interface IProps {
    color: string
    dash?: string
    width?: number
}

// A model's line as the legend and the methodology draw it. Round caps would close a dash pattern's gaps at this
// stroke width, so dashed models get butt caps, like the chart lines.
export function LineSwatch({ color, dash, width = 18 }: IProps) {
    return (
        <svg width={width} height="6" aria-hidden="true" className="shrink-0 max-sm:w-3">
            <line
                x1="1"
                x2={width - 1}
                y1="3"
                y2="3"
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray={dash}
                strokeLinecap={dash ? 'butt' : 'round'}
            />
        </svg>
    )
}
