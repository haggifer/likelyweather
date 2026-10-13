import { getWindMarks, getWindTransform, WIND_ARROW_PATH, WIND_DOT_RADIUS } from '@fa/chart-core/wind-arrows'
import { ScaleTime } from 'd3-scale'
import { Circle, G, Path } from 'react-native-svg'

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[]
    y: number
    color: string
    mutedColor: string
}

// Each slot's median wind direction as an arrow, a dot where no model gave one.
export function WindArrows({ x, times, directions, y, color, mutedColor }: IProps) {
    return (
        <G>
            {getWindMarks(x, times, directions).map(({ key, x: cx, deg }) =>
                deg === null ? (
                    <Circle key={key} cx={cx} cy={y} r={WIND_DOT_RADIUS} fill={mutedColor} />
                ) : (
                    <G key={key} transform={getWindTransform(cx, y, deg)}>
                        <Path d={WIND_ARROW_PATH} fill={color} />
                    </G>
                ),
            )}
        </G>
    )
}
