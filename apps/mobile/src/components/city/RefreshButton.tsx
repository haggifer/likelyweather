import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { RefreshCw } from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { showSnackbar } from '../../lib/snackbar-store'
import { Button } from '../legacy-ui/Button'

interface IProps {
    isAvailable: boolean
    isFetching: boolean
    onRefresh: () => void
    // A row with room for icons only keeps the label for TalkBack.
    isIconOnly?: boolean
}

// Offered once the data is REFRESH_AFTER_HOURS old, the same rule the server uses to fetch again. The web explains a
// disabled Refresh in a tooltip; a phone has no hover, so a tap on it says why in the snackbar.
export function RefreshButton({ isAvailable, isFetching, onRefresh, isIconOnly = false }: IProps) {
    const t = useTranslations('city')

    const explanation = isAvailable ? t('refreshTitle') : t('upToDate', { hours: REFRESH_AFTER_HOURS })

    return (
        <Button
            variant="outline"
            icon={RefreshCw}
            label={isIconOnly ? undefined : t('refresh')}
            accessibilityLabel={t('refresh')}
            onPress={onRefresh}
            isDisabled={!isAvailable}
            onDisabledPress={() => showSnackbar(explanation)}
            isBusy={isFetching}
            accessibilityHint={explanation}
        />
    )
}
