import { StyleProp, View, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface IProps {
    height: number
    width?: number | `${number}%`
    style?: StyleProp<ViewStyle>
}

export function Skeleton({ height, width = '100%', style }: IProps) {
    const { colors, radius } = useTheme()

    return <View style={[{ height, width, borderRadius: radius * 0.6, backgroundColor: colors.muted }, style]} />
}
