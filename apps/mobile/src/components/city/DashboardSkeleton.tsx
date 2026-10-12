import { View } from 'react-native'
import { Skeleton } from '../ui/Skeleton'

// The loaded cards' heights on a phone: the chart card with its two-column model list and summary, then the row of day
// tiles, so nothing jumps when the forecast arrives.
const CHART_CARD_HEIGHT = 690
const TILES_CARD_HEIGHT = 210

interface IProps {
    gap: number
}

export function DashboardSkeleton({ gap }: IProps) {
    return (
        <View style={{ gap }}>
            <Skeleton height={CHART_CARD_HEIGHT} />
            <Skeleton height={TILES_CARD_HEIGHT} />
        </View>
    )
}
