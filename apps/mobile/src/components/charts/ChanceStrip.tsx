import { getSumBarCenter } from '@fa/chart-core/spaghetti-geometry'
import { ScaleTime } from 'd3-scale'
import { G, Text as SvgText } from 'react-native-svg'
import { getFontFamily } from '../../theme/fonts'

// Half the cap height of the tick font, so a label centres on the strip's middle like the axis ticks on their lines.
const BASELINE_SHIFT = 3.5
const LIKELY = 0.5

interface IProps {
    x: ScaleTime<number, number>
    times: Date[]
    chance: (number | null)[]
    slotMs: number
    barWidth: number
    plotRight: number
    y: number
    fontSize: number
    color: string
    mutedColor: string
}

// The share of models above 0.2 mm under each precipitation bar, in percent; the unit stands once in the pinned tick
// column. Every slot is wide enough for its label. Likely slots (half the models or more) stand out.
export function ChanceStrip({ x, times, chance, slotMs, barWidth, plotRight, y, fontSize, color, mutedColor }: IProps) {
    return (
        <G>
            {chance.map((c, i) => {
                const center = x(getSumBarCenter(times[i], slotMs))

                if (c === null || center + barWidth / 2 > plotRight) return null

                return (
                    <SvgText
                        key={times[i].toISOString()}
                        x={center}
                        y={y + BASELINE_SHIFT}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fontFamily={getFontFamily(c >= LIKELY ? '600' : '400')}
                        fill={c >= LIKELY ? color : mutedColor}
                    >
                        {String(Math.round(c * 100))}
                    </SvgText>
                )
            })}
        </G>
    )
}
