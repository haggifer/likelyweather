import { SkFont, Text } from '@shopify/react-native-skia'

export type TextAnchor = 'start' | 'middle' | 'end'

interface Halo {
    color: string
    width: number
}

// SVG anchors a label by its advance width, the sum of its glyphs' advances; Skia draws every label from its left
// edge.
const getAdvanceWidth = (font: SkFont, text: string) =>
    font.getGlyphWidths(font.getGlyphIDs(text)).reduce((sum, width) => sum + width, 0)

const getStartX = (font: SkFont | null, text: string, x: number, anchor: TextAnchor) => {
    if (!font || anchor === 'start') return x

    const width = getAdvanceWidth(font, text)

    return anchor === 'middle' ? x - width / 2 : x - width
}

interface IProps {
    font: SkFont | null
    text: string
    x: number
    // The baseline, as an SVG text's `y`.
    y: number
    color: string
    anchor?: TextAnchor
    // A card-coloured outline drawn under the text, where the web uses `paint-order: stroke`.
    halo?: Halo
}

// A chart label placed like SVG text; nothing is drawn until the font has loaded.
export function CanvasText({ font, text, x, y, color, anchor = 'start', halo }: IProps) {
    const startX = getStartX(font, text, x, anchor)

    return (
        <>
            {halo && (
                <Text
                    font={font}
                    text={text}
                    x={startX}
                    y={y}
                    color={halo.color}
                    style="stroke"
                    strokeWidth={halo.width}
                    strokeJoin="round"
                />
            )}
            <Text font={font} text={text} x={startX} y={y} color={color} />
        </>
    )
}
