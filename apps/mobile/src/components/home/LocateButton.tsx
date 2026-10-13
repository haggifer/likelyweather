import { getErrorKind } from '@fa/api-client/error-kind'
import { Locale } from '@fa/shared/api'
import { getLocateFarValues } from '@fa/shared/locate'
import { Place, toPlace } from '@fa/shared/places'
import { onlineManager } from '@tanstack/react-query'
import { LocateFixed } from 'lucide-react-native'
import { ActivityIndicator } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useLocateCity } from '../../hooks/useLocateCity'
import { useTheme } from '../../hooks/useTheme'
import { PositionError } from '../../lib/position'
import { showSnackbar } from '../../lib/snackbar-store'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'

interface IProps {
    onLocated: (place: Place) => void
    onSearch: () => void
}

// "Use my location": asks Android for the position on a tap only, never on launch.
export function LocateButton({ onLocated, onSearch }: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale
    const { colors } = useTheme()

    const locate = useLocateCity()

    const handlePress = () => {
        // Offline the request would wait, spinning, for the network; say so at once instead.
        if (!onlineManager.isOnline()) {
            showSnackbar(te('offline'))
            return
        }

        locate.mutate(locale, {
            onSuccess: (result) => {
                if (result.kind === 'open') {
                    onLocated(result.place)
                    return
                }

                showSnackbar(t('locateFar', getLocateFarValues(result.city, result.distanceKm, locale)), [
                    { label: t('locateSearch'), onPress: onSearch },
                    { label: t('locateUse'), onPress: () => onLocated(toPlace(result.city)) },
                ])
            },
            onError: (error) =>
                showSnackbar(error instanceof PositionError ? t('locateUnavailable') : te(getErrorKind(error))),
        })
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onPress={handlePress}
            disabled={locate.isPending}
            accessibilityLabel={t('locate')}
            accessibilityState={{ busy: locate.isPending, disabled: locate.isPending }}
        >
            {locate.isPending ? (
                <ActivityIndicator size="small" color={colors['muted-foreground']} />
            ) : (
                <Icon as={LocateFixed} className="size-5 text-muted-foreground" />
            )}
        </Button>
    )
}
