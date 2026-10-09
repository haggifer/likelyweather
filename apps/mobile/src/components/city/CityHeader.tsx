import { useLatest } from '@fa/api-client/hooks/useLatest'
import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { City } from '@fa/shared/api'
import { getCityRegion } from '@fa/shared/city-region'
import { getCityName } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { LucideIcon, Pencil, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useNow } from '../../hooks/useNow'
import { useTheme } from '../../hooks/useTheme'
import { SearchBox } from '../home/SearchBox'
import { CityTitle } from './CityTitle'
import { FavoriteToggle } from './FavoriteToggle'
import { RefreshButton } from './RefreshButton'
import { UpdatedChip } from './UpdatedChip'

// The web's `pointer-coarse:size-9` targets.
export const HEADER_BUTTON_SIZE = 36

const styles = StyleSheet.create({
    header: { gap: 8 },
    status: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
    switcher: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    search: { flex: 1 },
    button: { width: HEADER_BUTTON_SIZE, height: HEADER_BUTTON_SIZE, alignItems: 'center', justifyContent: 'center' },
    close: { marginTop: 6 },
})

interface IconButtonProps {
    icon: LucideIcon
    label: string
    onPress: () => void
}

const IconButton = ({ icon: Icon, label, onPress }: IconButtonProps) => {
    const { colors } = useTheme()

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
        >
            <Icon size={20} color={colors['muted-foreground']} />
        </Pressable>
    )
}

interface IProps {
    city: City
    onSelectCity: (slug: string) => void
}

// The name doubles as a switcher: the pencil swaps both lines for a search box holding the current name, selected so
// typing replaces it. Picking a result opens that city; a tap elsewhere, Android's back or the close button keeps this
// one. The second line carries the age chip and Refresh, right-aligned together, as on the web's phone header.
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
            <View style={styles.switcher}>
                <View style={styles.search}>
                    <SearchBox initialQuery={name} autoFocus onDismiss={handleClose} onSelectCity={onSelectCity} />
                </View>
                <View style={styles.close}>
                    <IconButton icon={X} label={ts('close')} onPress={handleClose} />
                </View>
            </View>
        )
    }

    return (
        <View style={styles.header}>
            <CityTitle name={name} region={getCityRegion(city, locale)} countryCode={city.countryCode}>
                <View style={styles.button}>
                    <FavoriteToggle place={city} size={20} />
                </View>
                <IconButton icon={Pencil} label={t('change')} onPress={() => setIsSwitching(true)} />
            </CityTitle>
            <View style={styles.status}>
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
        </View>
    )
}
