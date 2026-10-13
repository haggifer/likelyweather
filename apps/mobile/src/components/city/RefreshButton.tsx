import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { RefreshCw } from 'lucide-react-native'
import { ActivityIndicator } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { showSnackbar } from '../../lib/snackbar-store'
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

// Offered once the data is REFRESH_AFTER_HOURS old, the same rule the server uses to fetch again. The web explains a
// disabled Refresh in a tooltip; a phone has no hover, so a tap on it says why in the snackbar. It therefore only
// looks disabled and keeps taking taps, while a fetch in progress disables it for real.
export function RefreshButton({ isAvailable, isFetching, onRefresh, isIconOnly = false }: IProps) {
    const t = useTranslations('city')
    const { colors } = useTheme()

    const explanation = isAvailable ? t('refreshTitle') : t('upToDate', { hours: REFRESH_AFTER_HOURS })

    const handlePress = () => (isAvailable ? onRefresh() : showSnackbar(explanation))

    return (
        <Button
            variant="outline"
            size={isIconOnly ? 'icon' : 'default'}
            onPress={handlePress}
            // Pressable writes `disabled` into the accessibility state, which must keep saying disabled here.
            disabled={isFetching ? true : undefined}
            accessibilityLabel={t('refresh')}
            accessibilityHint={explanation}
            accessibilityState={{ disabled: !isAvailable || isFetching, busy: isFetching }}
            className={cn(!isAvailable && 'opacity-50')}
        >
            {isFetching ? (
                <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
                <Icon as={RefreshCw} className="size-4" />
            )}
            {!isIconOnly && <Text>{t('refresh')}</Text>}
        </Button>
    )
}
