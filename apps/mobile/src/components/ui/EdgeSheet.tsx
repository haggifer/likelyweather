import { ReactNode } from 'react'
import { View } from 'react-native'

// A card alone on a screen runs edge to edge over the screen's 16 dp padding, as the web's phone cards do
// (`data-bleed`): no corners and no top or bottom border, its side borders and shadow kept.
export const BLEED_CARD = '-mx-4 rounded-none border-y-0'

// A card inside an `EdgeSheet` drops its own frame; the sheet's dividers part it from the next one.
export const FLAT_CARD = 'rounded-none border-0 bg-transparent shadow-none'

interface IProps {
    children: ReactNode
}

// The web's phone city page (`data-sheet`): several cards joined into one edge-to-edge sheet, parted by dividers.
export function EdgeSheet({ children }: IProps) {
    return <View className="-mx-4 bg-card shadow-card">{children}</View>
}
