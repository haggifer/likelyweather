import { ChanceLabel } from '@fa/chart-core/overview-geometry'
import { CHART_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { G, Text as SvgText } from 'react-native-svg'
import { getFontFamily } from '../../theme/fonts'

// Half the cap height of the tick font, so a label centres on the strip's middle like the axis ticks on their lines.
const BASELINE_SHIFT = 3.5

interface IProps {
    labels: ChanceLabel[]
    y: number
    color: string
    mutedColor: string
}

// The chance of rain under the precipitation bars (`getChanceLabels`); likely slots stand out.
export function ChanceStrip({ labels, y, color, mutedColor }: IProps) {
    return (
        <G>
            {labels.map(({ key, x, text, isLikely }) => (
                <SvgText
                    key={key}
                    x={x}
                    y={y + BASELINE_SHIFT}
                    textAnchor="middle"
                    fontSize={CHART_FONT_SIZE}
                    fontFamily={getFontFamily(isLikely ? '600' : '400')}
                    fill={isLikely ? color : mutedColor}
                >
                    {text}
                </SvgText>
            ))}
        </G>
    )
}
