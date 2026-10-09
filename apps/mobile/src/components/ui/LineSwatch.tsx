import Svg, { Line } from 'react-native-svg'

interface IProps {
    color: string
    dash?: string
    width?: number
}

// A model's line as the web's legend and methodology draw it, dash pattern included: AIFS and met.no keep their
// dashes as a second encoding next to the colour. Round caps would close the gaps at this width, so dashes get butt
// caps, like the chart lines.
export function LineSwatch({ color, dash, width = 18 }: IProps) {
    return (
        <Svg width={width} height={6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Line
                x1={1}
                x2={width - 1}
                y1={3}
                y2={3}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray={dash}
                strokeLinecap={dash ? 'butt' : 'round'}
            />
        </Svg>
    )
}
