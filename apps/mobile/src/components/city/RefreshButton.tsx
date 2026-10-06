import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { RefreshCw } from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { Button } from '../ui/Button'

interface IProps {
    isAvailable: boolean
    isFetching: boolean
    onRefresh: () => void
}

// Offered once the data is REFRESH_AFTER_HOURS old, the same rule the server uses to fetch again.
export function RefreshButton({ isAvailable, isFetching, onRefresh }: IProps) {
    const t = useTranslations('city')

    return (
        <Button
            variant="outline"
            icon={RefreshCw}
            label={t('refresh')}
            onPress={onRefresh}
            isDisabled={!isAvailable}
            isBusy={isFetching}
            accessibilityLabel={isAvailable ? t('refreshTitle') : t('upToDate', { hours: REFRESH_AFTER_HOURS })}
        />
    )
}
