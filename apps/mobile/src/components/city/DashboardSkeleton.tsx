import { View } from 'react-native'
import { Skeleton } from '../ui/skeleton'

// The loaded cards' heights on a phone: the chart card with its two-column model list and summary (690 px), then the
// row of day tiles (210 px), so nothing jumps when the forecast arrives.
export function DashboardSkeleton() {
    return (
        <View className="gap-3">
            <Skeleton className="h-[43.125rem]" />
            <Skeleton className="h-[13.125rem]" />
        </View>
    )
}
