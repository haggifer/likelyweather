import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { RefreshCw } from 'lucide-react-native'
import { useEffect } from 'react'
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Hint } from '../shell/Hint'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

interface IProps {
    isAvailable: boolean
    isFetching: boolean
    onRefresh: () => void
    // A row with room for icons only keeps the label for TalkBack.
    isIconOnly?: boolean
}

// The web's `animate-spin` on the same icon while a fetch runs: one turn a second.
const SPIN_MS = 1000

const SpinningIcon = ({ isSpinning, className }: { isSpinning: boolean; className?: string }) => {
    const turn = useSharedValue(0)

    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }))

    useEffect(() => {
        if (isSpinning) {
            turn.set(withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1, false))
        } else {
            cancelAnimation(turn)
            turn.set(0)
        }
    }, [isSpinning, turn])

    return (
        <Animated.View style={style}>
            <Icon as={RefreshCw} className={className} />
        </Animated.View>
    )
}

// Offered once the data is REFRESH_AFTER_HOURS old, the same rule the server uses to fetch again. Before that, as on
// the web, it looks disabled and a tap explains why in a hint bubble; a fetch in progress disables it for real.
export function RefreshButton({ isAvailable, isFetching, onRefresh, isIconOnly = false }: IProps) {
    const t = useTranslations('city')

    const explanation = isAvailable ? t('refreshTitle') : t('upToDate', { hours: REFRESH_AFTER_HOURS })

    const button = (
        // The web's `sm` button at its phone sizes: a 36 px square with a 16 px icon in the overview's row, 36 px tall
        // with a label.
        <Button
            variant="outline"
            size="sm"
            onPress={isAvailable ? onRefresh : undefined}
            // Pressable writes `disabled` into the accessibility state, which must keep saying disabled here.
            disabled={isFetching ? true : undefined}
            accessibilityLabel={t('refresh')}
            accessibilityHint={explanation}
            accessibilityState={{ disabled: !isAvailable || isFetching, busy: isFetching }}
            className={cn(isIconOnly ? 'size-9 px-0' : 'h-9', !isAvailable && 'opacity-50')}
        >
            <SpinningIcon isSpinning={isFetching} className={isIconOnly ? 'size-4' : undefined} />
            {!isIconOnly && <Text className="text-sm">{t('refresh')}</Text>}
        </Button>
    )

    if (isAvailable) return button

    return <Hint content={explanation}>{button}</Hint>
}
