import { getErrorKind } from '@fa/api-client/error-kind'
import { useGeocode } from '@fa/api-client/hooks/useGeocode'
import { useTrackCity } from '@fa/api-client/hooks/useTrackCity'
import { GeocodeResponse, GeocodeResult, Locale } from '@fa/shared/api'
import { SEARCH_DEBOUNCE_MS } from '@fa/shared/constants'
import { getCityLabel } from '@fa/shared/format'
import { addRecent, getPlaceList, isFavorite, Place, rankByFavorite, toPlace } from '@fa/shared/places'
import { onlineManager } from '@tanstack/react-query'
import { Search, Star } from 'lucide-react-native'
import { ReactNode, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    BackHandler,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { placesStore } from '../../lib/places-store'
import { showSnackbar } from '../../lib/snackbar-store'
import { getFontFamily } from '../../theme/fonts'
import { FlagIcon } from '../ui/FlagIcon'
import { Text } from '../ui/Text'
import { LocateButton } from './LocateButton'

const MIN_QUERY = 3
const ROW_HEIGHT = 44
// Five rows stay above the keyboard on a small phone; the rest scroll inside the list.
const MAX_VISIBLE_ROWS = 5

const styles = StyleSheet.create({
    field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingLeft: 12, minHeight: 48 },
    input: { flex: 1, fontSize: 16, fontFamily: getFontFamily('400'), paddingVertical: 10 },
    list: { borderWidth: 1, marginTop: 6, overflow: 'hidden' },
    rows: { maxHeight: ROW_HEIGHT * MAX_VISIBLE_ROWS },
    heading: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: ROW_HEIGHT },
    rowText: { flex: 1, fontSize: 14 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
    hint: { flexShrink: 1, fontSize: 13 },
})

const byPopulation = (a: GeocodeResult, b: GeocodeResult) => (b.population ?? 0) - (a.population ?? 0)

const getResultLabel = (result: GeocodeResult) =>
    [result.name, result.admin1, result.country].filter(Boolean).join(', ')

interface IProps {
    onSelectCity: (slug: string) => void
    // Called whenever the field lets go of focus (a pick, a tap elsewhere, Android's back), so a switcher can fold away.
    onDismiss?: () => void
    // The current city's name for a switcher: it starts selected, so typing replaces it, and results only appear once
    // it has been edited, like the web's.
    initialQuery?: string
    isLocateShown?: boolean
    autoFocus?: boolean
}

// Typing three letters searches any place; picking a result stores it and makes it the newest recent place. While
// the field is focused and empty it lists the viewer's places instead, favorites first. The keyboard's Search key
// picks the first row, as Enter does on the web.
export function SearchBox({
    onSelectCity,
    onDismiss,
    initialQuery = '',
    isLocateShown = false,
    autoFocus = false,
}: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale
    const places = usePlaces()
    const { colors, radius } = useTheme()

    const inputRef = useRef<TextInput>(null)
    const [query, setQuery] = useState(initialQuery)
    const [isOpen, setIsOpen] = useState(autoFocus)
    const [lastAnswer, setLastAnswer] = useState<GeocodeResponse | undefined>()

    const isEdited = query !== initialQuery
    const debounced = useDebouncedValue(isEdited ? query.trim() : '', SEARCH_DEBOUNCE_MS)
    const { data, isFetching, isError, error, fetchStatus } = useGeocode(debounced, locale)
    const track = useTrackCity()

    // A failed search keeps the previous answer under its error line, like the web.
    if (data && data !== lastAnswer) setLastAnswer(data)

    const trimmed = query.trim()
    const answer = data ?? (isError ? lastAnswer : undefined)
    const results = rankByFavorite([...(answer?.results ?? [])].sort(byPopulation), places)
    const isPlacesView = !isEdited || trimmed.length === 0
    const isQueryReady = trimmed.length >= MIN_QUERY
    const isOffline = fetchStatus === 'paused'
    const placeList = getPlaceList(places)

    const close = () => {
        setIsOpen(false)
        setQuery('')
        Keyboard.dismiss()
    }

    const dismiss = () => {
        setIsOpen(false)
        onDismiss?.()
    }

    const handleSelectPlace = (place: Place) => {
        close()
        onSelectCity(place.slug)
    }

    const handleSelectResult = (result: GeocodeResult) => {
        // A mutation made offline would wait, spinning, for the network; the web's request fails at once instead.
        if (!onlineManager.isOnline()) {
            showSnackbar(te('offline'))
            return
        }

        track.mutate(result.id, {
            onSuccess: ({ slug }) => {
                placesStore.set((current) => addRecent(current, toPlace({ ...result, slug })))
                close()
                onSelectCity(slug)
            },
            onError: (trackError) => showSnackbar(te(getErrorKind(trackError))),
        })
    }

    const handleSubmit = () => {
        if (isPlacesView && placeList[0]) handleSelectPlace(placeList[0])
        else if (isQueryReady && results[0]) handleSelectResult(results[0])
    }

    const handleLocated = (place: Place) => {
        placesStore.set((current) => addRecent(current, place))
        close()
        onSelectCity(place.slug)
    }

    const renderStar = (id: number) =>
        isFavorite(places, id) ? <Star size={14} color={colors.favorite} fill={colors['favorite-fill']} /> : null

    const renderStatus = (text: string, color: string, isBusy = false) => (
        <View style={styles.status} accessible accessibilityLiveRegion="polite">
            {isBusy && <ActivityIndicator size="small" color={colors['muted-foreground']} />}
            <Text style={[styles.hint, { color }]}>{text}</Text>
        </View>
    )

    const renderRows = (heading: string, rows: ReactNode) => (
        <View>
            <Text style={[styles.heading, { color: colors['muted-foreground'] }]}>{heading}</Text>
            <ScrollView style={styles.rows} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {rows}
            </ScrollView>
        </View>
    )

    const renderResults = () => {
        if (!isQueryReady) return renderStatus(t('hint'), colors['muted-foreground'])

        const errorLine = isError ? renderStatus(te(getErrorKind(error)), colors.destructive) : null

        if (!results.length) {
            if (errorLine) return errorLine

            if (isOffline) return renderStatus(te('offline'), colors['muted-foreground'])

            return isFetching
                ? renderStatus(t('searching'), colors['muted-foreground'], true)
                : renderStatus(t('empty'), colors['muted-foreground'])
        }

        return (
            <View>
                {errorLine}
                {renderRows(
                    t('results'),
                    results.map((result) => (
                        <Pressable
                            key={result.id}
                            onPress={() => handleSelectResult(result)}
                            disabled={track.isPending}
                            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
                            accessibilityRole="button"
                        >
                            <FlagIcon countryCode={result.countryCode} />
                            <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                                {getResultLabel(result)}
                            </Text>
                            {renderStar(result.id)}
                        </Pressable>
                    )),
                )}
            </View>
        )
    }

    // Android's back first hides the keyboard, which leaves the field focused; losing the keyboard closes the list.
    useEffect(() => {
        if (!isOpen) return

        const keyboard = Keyboard.addListener('keyboardDidHide', () => inputRef.current?.blur())
        const back = BackHandler.addEventListener('hardwareBackPress', () => {
            inputRef.current?.blur()
            return true
        })

        return () => {
            keyboard.remove()
            back.remove()
        }
    }, [isOpen])

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
                    onBlur={dismiss}
                    onSubmitEditing={handleSubmit}
                    placeholder={t('placeholder')}
                    placeholderTextColor={colors['muted-foreground']}
                    accessibilityLabel={t('label')}
                    autoFocus={autoFocus}
                    selectTextOnFocus={Boolean(initialQuery)}
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
                    {isPlacesView
                        ? renderRows(
                              t('places'),
                              placeList.map((place) => (
                                  <Pressable
                                      key={place.id}
                                      onPress={() => handleSelectPlace(place)}
                                      style={({ pressed }) => [
                                          styles.row,
                                          pressed && { backgroundColor: colors.muted },
                                      ]}
                                      accessibilityRole="button"
                                  >
                                      <FlagIcon countryCode={place.countryCode} />
                                      <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
                                          {getCityLabel(place, locale)}
                                      </Text>
                                      {renderStar(place.id)}
                                  </Pressable>
                              )),
                          )
                        : renderResults()}
                </View>
            )}
        </View>
    )
}
