import { ReactNode } from 'react'
import { View } from 'react-native'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/text'

interface IProps {
    name: string
    region: string
    countryCode: string | null
    // The star and the pencil, or their placeholders, at the right edge.
    children?: ReactNode
}

export function CityTitle({ name, region, countryCode, children }: IProps) {
    return (
        <View className="min-h-12 flex-row items-center gap-1.5">
            <View className="flex-1 flex-row items-center gap-2.5">
                {countryCode && <FlagIcon countryCode={countryCode} width={24} />}
                <Text className="shrink text-xl tracking-tight" accessibilityRole="header">
                    <Text className="text-xl font-bold">{name}</Text>
                    {region && <Text className="text-xl font-medium text-muted-foreground">, {region}</Text>}
                </Text>
            </View>
            {children && <View className="flex-row items-center gap-1">{children}</View>}
        </View>
    )
}
