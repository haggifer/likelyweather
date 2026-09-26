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

const ARROW = 'M0,-7 L4,3 L0,1 L-4,3 Z'

export const getCompassLabel = (degrees: number, labels: string[]) =>
    labels[Math.round((((degrees % 360) + 360) % 360) / (360 / labels.length)) % labels.length]

// Meteorological direction is where the wind comes FROM; the arrow points where it blows to (+180°).
export default function WindArrows({ x, times, directions, y, color, mutedColor, compassLabels }: IProps) {
    return (
        <g aria-hidden="true">
            {directions.map((deg, i) => {
                const cx = x(times[i])

                if (deg === null) {
                    return <circle key={times[i].toISOString()} cx={cx} cy={y} r={1.5} fill={mutedColor} />
                }

                return (
                    <g key={times[i].toISOString()} transform={`translate(${cx},${y}) rotate(${deg + 180})`}>
                        <title>{`${getCompassLabel(deg, compassLabels)} ${Math.round(deg)}°`}</title>
                        <path d={ARROW} fill={color} />
                    </g>
                )
            })}
        </g>
    )
}
