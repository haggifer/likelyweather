import { getWindMarks, WIND_ARROW_PATH, WIND_DOT_RADIUS } from '@fa/chart-core/wind-arrows'
import { Circle, Group, Path } from '@shopify/react-native-skia'
import { ScaleTime } from 'd3-scale'

// `getWindTransform`'s `rotate(deg + 180)`: the arrow points where the wind blows to.
const getArrowTransform = (x: number, y: number, deg: number) => [
    { translateX: x },
    { translateY: y },
    { rotate: ((deg + 180) * Math.PI) / 180 },
]

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[]
    y: number
    color: string
    mutedColor: string
}

export function CanvasWindArrows({ x, times, directions, y, color, mutedColor }: IProps) {
    return (
        <Group>
            {getWindMarks(x, times, directions).map(({ key, x: cx, deg }) =>
                deg === null ? (
                    <Circle key={key} cx={cx} cy={y} r={WIND_DOT_RADIUS} color={mutedColor} />
                ) : (
                    <Group key={key} transform={getArrowTransform(cx, y, deg)}>
                        <Path path={WIND_ARROW_PATH} color={color} />
                    </Group>
                ),
            )}
        </Group>
    )
}
