import { getErrorKind } from '@fa/api-client/error-kind'
import { Locale } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { formatDistanceKm } from '@fa/shared/geo'
import { Place, toPlace } from '@fa/shared/places'
import { onlineManager } from '@tanstack/react-query'
import { LocateFixed } from 'lucide-react-native'
import { ActivityIndicator, Pressable } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useLocateCity } from '../../hooks/useLocateCity'
import { useTheme } from '../../hooks/useTheme'
import { PositionError } from '../../lib/position'
import { showSnackbar } from '../../lib/snackbar-store'

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

                showSnackbar(
                    t('locateFar', {
                        name: getCityName(result.city, locale),
                        km: formatDistanceKm(result.distanceKm, locale),
                    }),
                    [
                        { label: t('locateSearch'), onPress: onSearch },
                        { label: t('locateUse'), onPress: () => onLocated(toPlace(result.city)) },
                    ],
                )
            },
            onError: (error) =>
                showSnackbar(error instanceof PositionError ? t('locateUnavailable') : te(getErrorKind(error))),
        })
    }

    return (
        <Pressable
            onPress={handlePress}
            disabled={locate.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('locate')}
            accessibilityState={{ busy: locate.isPending }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
            {locate.isPending ? (
                <ActivityIndicator size="small" color={colors['muted-foreground']} />
            ) : (
                <LocateFixed size={20} color={colors['muted-foreground']} />
            )}
        </Pressable>
    )
}
