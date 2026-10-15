import { View } from 'react-native'
import { Skeleton } from '../ui/skeleton'

interface IProps {
    // The day tiles' card follows once the city is known, as on the web.
    hasTiles?: boolean
}

// The web's phone skeleton (Dashboard and CityShell there): the chart card with its model list, then the day tiles.
export function DashboardSkeleton({ hasTiles = true }: IProps) {
    return (
        <View className="gap-4">
            <Skeleton className="h-[37.5rem]" />
            {hasTiles && <Skeleton className="h-[9rem]" />}
        </View>
    )
}
