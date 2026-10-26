import { ChanceLabel } from '@fa/chart-core/overview-geometry'
import { LABEL_FONT_SIZE } from '@fa/chart-core/plot-geometry'
import { Group, SkFont } from '@shopify/react-native-skia'
import { CanvasText } from './CanvasText'

// Half the cap height of the tick font, so a label centres on the strip's middle like the axis ticks on their lines.
const BASELINE_SHIFT = LABEL_FONT_SIZE * 0.32

interface IProps {
    labels: ChanceLabel[]
    y: number
    color: string
    mutedColor: string
    font: SkFont | null
    likelyFont: SkFont | null
}

// The web's `ChanceStrip` on a Skia canvas.
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
