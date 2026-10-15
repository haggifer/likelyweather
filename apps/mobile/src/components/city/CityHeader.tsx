import { useLatest } from '@fa/api-client/hooks/useLatest'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react-native'
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

interface IProps {
    city: City
    onSelectCity: (slug: string) => void
}

// The name doubles as a switcher: the pencil swaps both lines for a search box holding the current name, selected so
// typing replaces it. Picking a result opens that city; a tap elsewhere or Android's back keeps this one, as a blur
// or Escape does on the web. The second line carries the age chip and Refresh, right-aligned together, as on the web's phone header, and
// only once the run is outdated (author, 2026-10-14).
export function CityHeader({ city, onSelectCity }: IProps) {
    const t = useTranslations('city')
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
        return <SearchBox initialQuery={name} autoFocus onDismiss={handleClose} onSelectCity={onSelectCity} />
    }

    return (
        <View className="gap-2">
            <CityTitle name={name} region={getCityRegion(city, locale)} countryCode={city.countryCode}>
                <FavoriteToggle place={city} className="size-9" />
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onPress={() => setIsSwitching(true)}
                    accessibilityLabel={t('change')}
                    className="size-9"
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
