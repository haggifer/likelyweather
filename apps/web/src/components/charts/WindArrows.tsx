import { formatWindDirection } from '@fa/shared/format'
import { ScaleTime } from 'd3-scale'

const ARROW = 'M0,-7 L4,3 L0,1 L-4,3 Z'

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    directions: (number | null)[]
    y: number
    color: string
    mutedColor: string
    compassLabels: string[]
}

// Meteorological direction is where the wind comes FROM; the arrow points where it blows to (+180°).
export function WindArrows({ x, times, directions, y, color, mutedColor, compassLabels }: IProps) {
    return (
        <g aria-hidden="true">
            {directions.map((deg, i) => {
                const cx = x(times[i])

                if (deg === null) {
                    return <circle key={times[i].toISOString()} cx={cx} cy={y} r={1.5} fill={mutedColor} />
                }

                return (
                    <g key={times[i].toISOString()} transform={`translate(${cx},${y}) rotate(${deg + 180})`}>
                        <title>{formatWindDirection(deg, compassLabels)}</title>
                        <path d={ARROW} fill={color} />
                    </g>
                )
            })}
        </g>
    )
}
