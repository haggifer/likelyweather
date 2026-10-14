import { useLatest } from '@fa/api-client/hooks/useLatest'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Pencil, X } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useNow } from '../../hooks/useNow'
import { SearchBox } from '../home/SearchBox'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { CityTitle } from './CityTitle'
import { FavoriteToggle } from './FavoriteToggle'
import { RefreshButton } from './RefreshButton'
import { UpdatedChip } from './UpdatedChip'

const STAR_SIZE = 20

interface IProps {
    city: City
    onSelectCity: (slug: string) => void
}

// The name doubles as a switcher: the pencil swaps both lines for a search box holding the current name, selected so
// typing replaces it. Picking a result opens that city; a tap elsewhere, Android's back or the close button keeps this
// one. The second line carries the age chip and Refresh, right-aligned together, as on the web's phone header, and
// only once the run is outdated (author, 2026-10-14).
export function CityHeader({ city, onSelectCity }: IProps) {
    const t = useTranslations('city')
    const ts = useTranslations('search')
    const locale = useLocale()
    const now = useNow()
    const queryClient = useQueryClient()

    const [isSwitching, setIsSwitching] = useState(false)

    // The dashboard anchors its chart to the precipitation query, so that query also dates the run shown here. When it
    // failed before any run arrived there is no date, but Refresh must stay available: it is the only way to ask again.
    const { data: latest, isError } = useLatest(city.slug, Variable.Precip)
    const isFetching = useIsFetching({ queryKey: ['latest', city.slug] }) > 0

    const name = getCityName(city, locale)
    const isOutdated = (isError && !latest) || isRefreshOffered(latest?.fetchedAt, now)

    const handleRefresh = () => void queryClient.refetchQueries({ queryKey: ['latest', city.slug], type: 'active' })
    const handleClose = () => setIsSwitching(false)

    if (isSwitching) {
        return (
            <View className="flex-row items-start gap-1.5">
                <View className="flex-1">
                    <SearchBox initialQuery={name} autoFocus onDismiss={handleClose} onSelectCity={onSelectCity} />
                </View>
                <Button
                    variant="ghost"
                    size="icon"
                    onPress={handleClose}
                    accessibilityLabel={ts('close')}
                    className="mt-1.5"
                >
                    <Icon as={X} className="text-muted-foreground" />
                </Button>
            </View>
        )
    }

    return (
        <View className="gap-2">
            <CityTitle name={name} region={getCityRegion(city, locale)} countryCode={city.countryCode}>
                <View className="size-9 items-center justify-center">
                    <FavoriteToggle place={city} size={STAR_SIZE} />
                </View>
                <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => setIsSwitching(true)}
                    accessibilityLabel={t('change')}
                >
                    <Icon as={Pencil} className="text-muted-foreground" />
                </Button>
            </CityTitle>
            {isOutdated && (
                <View className="flex-row flex-wrap items-center justify-end gap-2">
                    {latest && (
                        <UpdatedChip
                            fetchedAt={latest.fetchedAt}
                            issueTime={latest.issueTime}
                            timeZone={city.timezone}
                            now={now}
                        />
                    )}
                    <RefreshButton isAvailable={isOutdated} isFetching={isFetching} onRefresh={handleRefresh} />
                </View>
            )}
        </View>
    )
}
