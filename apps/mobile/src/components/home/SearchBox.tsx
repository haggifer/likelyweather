import { getErrorKind } from '@fa/api-client/error-kind'
import { useGeocode } from '@fa/api-client/hooks/useGeocode'
import { useTrackCity } from '@fa/api-client/hooks/useTrackCity'
import { GeocodeResult, Locale } from '@fa/shared/api'
import { getCityLabel } from '@fa/shared/format'
import { addRecent, getPlaceList, isFavorite, Place, rankByFavorite, toPlace } from '@fa/shared/places'
import { Search, Star } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { placesStore } from '../../lib/places-store'
import { getFontFamily } from '../../theme/fonts'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/Text'
import { LocateButton } from './LocateButton'

const MIN_QUERY = 3
const DEBOUNCE_MS = 250
// The places list under an empty field; the web lists up to 50, a phone shows the first screenful.
const MAX_LISTED_PLACES = 12

const styles = StyleSheet.create({
    field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingLeft: 12, minHeight: 48 },
    input: { flex: 1, fontSize: 16, fontFamily: getFontFamily('400'), paddingVertical: 10 },
    list: { borderWidth: 1, marginTop: 6, overflow: 'hidden' },
    heading: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 44 },
    rowText: { flex: 1, fontSize: 14 },
    hint: { fontSize: 13, paddingHorizontal: 12, paddingVertical: 12 },
})

const byPopulation = (a: GeocodeResult, b: GeocodeResult) => (b.population ?? 0) - (a.population ?? 0)

interface IProps {
    onSelectCity: (slug: string) => void
    isLocateShown?: boolean
    autoFocus?: boolean
}

// Typing three letters searches any place; picking a result stores it and makes it the newest recent place. While
// the field is focused and empty it lists the viewer's places instead, favorites first.
export function SearchBox({ onSelectCity, isLocateShown = false, autoFocus = false }: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale
    const places = usePlaces()
    const { colors, radius } = useTheme()

    const inputRef = useRef<TextInput>(null)
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(autoFocus)

    const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS)
    const { data, isFetching, isError, error } = useGeocode(debounced, locale)
    const track = useTrackCity()

    const trimmed = query.trim()
    const results = rankByFavorite([...(data?.results ?? [])].sort(byPopulation), places)
    const isPlacesView = trimmed.length === 0
    const isQueryReady = trimmed.length >= MIN_QUERY
    const placeList = getPlaceList(places).slice(0, MAX_LISTED_PLACES)

    const close = () => {
        setIsOpen(false)
        setQuery('')
        Keyboard.dismiss()
    }

    const handleSelectPlace = (place: Place) => {
        close()
        onSelectCity(place.slug)
    }

    const handleSelectResult = (result: GeocodeResult) =>
        track.mutate(result.id, {
            onSuccess: ({ slug }) => {
                placesStore.set((current) => addRecent(current, toPlace({ ...result, slug })))
                close()
                onSelectCity(slug)
            },
            onError: (trackError) => Alert.alert(te(getErrorKind(trackError))),
        })

    const handleLocated = (place: Place) => {
        placesStore.set((current) => addRecent(current, place))
        close()
        onSelectCity(place.slug)
    }

    const renderStar = (id: number) =>
        isFavorite(places, id) ? <Star size={14} color={colors.favorite} fill={colors['favorite-fill']} /> : null

    const renderResults = () => {
        if (!isQueryReady) return <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>{t('hint')}</Text>

        if (isError) return <Text style={[styles.hint, { color: colors.destructive }]}>{te(getErrorKind(error))}</Text>

        if (!results.length) {
            return (
                <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
                    {isFetching ? t('searching') : t('empty')}
                </Text>
            )
        }

        return (
            <View>
                <Text style={[styles.heading, { color: colors['muted-foreground'] }]}>{t('results')}</Text>
                {results.map((result) => (
                    <Pressable
                        key={result.id}
                        onPress={() => handleSelectResult(result)}
                        disabled={track.isPending}
                        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
                        accessibilityRole="button"
                    >
                        <FlagIcon countryCode={result.countryCode} />
                        <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                            {[result.name, result.admin1, result.country].filter(Boolean).join(', ')}
                        </Text>
                        {renderStar(result.id)}
                    </Pressable>
                ))}
            </View>
        )
    }

    return (
        <View>
            <View
                style={[
                    styles.field,
                    {
                        backgroundColor: colors.card,
                        borderColor: isOpen ? colors.ring : colors.border,
                        borderRadius: radius,
                    },
                ]}
            >
                <Search size={18} color={colors['muted-foreground']} />
                <TextInput
                    ref={inputRef}
                    value={query}
                    onChangeText={setQuery}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => !query && setIsOpen(false)}
                    placeholder={t('placeholder')}
                    placeholderTextColor={colors['muted-foreground']}
                    accessibilityLabel={t('label')}
                    autoFocus={autoFocus}
                    autoCorrect={false}
                    returnKeyType="search"
                    style={[styles.input, { color: colors.foreground }]}
                />
                {track.isPending && <ActivityIndicator size="small" color={colors['muted-foreground']} />}
                {isLocateShown && <LocateButton onLocated={handleLocated} onSearch={() => inputRef.current?.focus()} />}
            </View>
            {isOpen && (
                <View
                    style={[
                        styles.list,
                        { backgroundColor: colors.popover, borderColor: colors.border, borderRadius: radius },
                    ]}
                >
                    {isPlacesView ? (
                        <View>
                            <Text style={[styles.heading, { color: colors['muted-foreground'] }]}>{t('places')}</Text>
                            {placeList.map((place) => (
                                <Pressable
                                    key={place.id}
                                    onPress={() => handleSelectPlace(place)}
                                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
                                    accessibilityRole="button"
                                >
                                    <FlagIcon countryCode={place.countryCode} />
                                    <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                                        {getCityLabel(place, locale)}
                                    </Text>
                                    {renderStar(place.id)}
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        renderResults()
                    )}
                </View>
            )}
        </View>
    )
}
