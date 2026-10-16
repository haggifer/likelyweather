import { ChanceLabel } from '@fa/chart-core/overview-geometry'
import { Group, SkFont } from '@shopify/react-native-skia'
import { CanvasText } from './CanvasText'

// Half the cap height of the tick font, so a label centres on the strip's middle like the axis ticks on their lines.
const BASELINE_SHIFT = 3.5

interface IProps {
    labels: ChanceLabel[]
    y: number
    color: string
    mutedColor: string
    font: SkFont | null
    likelyFont: SkFont | null
}

// `ChanceStrip` on a Skia canvas: the chance of rain under the precipitation bars; likely slots stand out.
export function CanvasChanceStrip({ labels, y, color, mutedColor, font, likelyFont }: IProps) {
    return (
        <Group>
            {labels.map(({ key, x, text, isLikely }) => (
                <CanvasText
                    key={key}
                    font={isLikely ? likelyFont : font}
                    text={text}
                    x={x}
                    y={y + BASELINE_SHIFT}
                    color={isLikely ? color : mutedColor}
                    anchor="middle"
                />
            ))}
        </Group>
    )
}
