import { ScaleTime } from 'd3-scale'
import { Circle, G, Path } from 'react-native-svg'

const ARROW = 'M0,-7 L4,3 L0,1 L-4,3 Z'

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[]
    y: number
    color: string
    mutedColor: string
}

// Meteorological direction is where the wind comes from; the arrow points where it blows to (+180°).
export function WindArrows({ x, times, directions, y, color, mutedColor }: IProps) {
    return (
        <G>
            {directions.map((deg, i) => {
                const cx = x(times[i])

                if (deg === null)
                    return <Circle key={times[i].toISOString()} cx={cx} cy={y} r={1.5} fill={mutedColor} />

                return (
                    <G key={times[i].toISOString()} transform={`translate(${cx},${y}) rotate(${deg + 180})`}>
                        <Path d={ARROW} fill={color} />
                    </G>
                )
            })}
        </G>
    )
}
