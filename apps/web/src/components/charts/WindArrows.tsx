import { getWindMarks, getWindTransform, WIND_ARROW_PATH, WIND_DOT_RADIUS } from '@fa/chart-core/wind-arrows'
import { formatWindDirection } from '@fa/shared/format'
import { ScaleTime } from 'd3-scale'

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[]
    y: number
    color: string
    mutedColor: string
    compassLabels: string[]
}

// Each slot's median wind direction as an arrow, a dot where no model gave one; its title names the direction.
export function WindArrows({ x, times, directions, y, color, mutedColor, compassLabels }: IProps) {
    return (
        <g aria-hidden="true">
            {getWindMarks(x, times, directions).map(({ key, x: cx, deg }) =>
                deg === null ? (
                    <circle key={key} cx={cx} cy={y} r={WIND_DOT_RADIUS} fill={mutedColor} />
                ) : (
                    <g key={key} transform={getWindTransform(cx, y, deg)}>
                        <title>{formatWindDirection(deg, compassLabels)}</title>
                        <path d={WIND_ARROW_PATH} fill={color} />
                    </g>
                ),
            )}
        </g>
    )
}
