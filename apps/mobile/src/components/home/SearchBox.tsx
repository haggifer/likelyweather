import { getErrorKind } from '@fa/api-client/error-kind'
import { useCitySearch } from '@fa/hooks/useCitySearch'
import { GeocodeResult, Locale } from '@fa/shared/api'
import { getResultLabel, isQueryReady, SearchStatus } from '@fa/shared/city-search'
import { getCityLabel } from '@fa/shared/format'
import { addRecent, getPlaceList, isFavorite, Place } from '@fa/shared/places'
import { onlineManager } from '@tanstack/react-query'
import { Search, Star } from 'lucide-react-native'
import { ReactNode, useEffect, useRef } from 'react'
import { ActivityIndicator, BackHandler, Keyboard, ScrollView, TextInput, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { placesStore } from '../../lib/places-store'
import { showSnackbar } from '../../lib/snackbar-store'
import { Button } from '../ui/button'
import { FlagIcon } from '../ui/FlagIcon'
import { Icon } from '../ui/icon'
import { Input } from '../ui/input'
import { Text } from '../ui/text'
import { LocateButton } from './LocateButton'

// Five 44 px rows stay above the keyboard on a small phone; the rest scroll inside the list.
const ROWS = 'max-h-55'
const ROW = 'h-11 justify-start gap-2 rounded-none px-3'

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
    const { colors } = useTheme()

    const inputRef = useRef<TextInput>(null)

    const search = useCitySearch({ initialQuery, locale, places, isInitiallyOpen: autoFocus })

    const placeList = getPlaceList(places)

    const close = () => {
        search.setIsOpen(false)
        search.setQuery('')
        Keyboard.dismiss()
    }

    const dismiss = () => {
        search.setIsOpen(false)
        onDismiss?.()
    }

    const handleSelectPlace = (place: Place) => {
        close()
        onSelectCity(place.slug)
    }

    // A new pick, or the located city, becomes the newest recent place.
    const handleSelectNew = (place: Place) => {
        placesStore.set((current) => addRecent(current, place))
        handleSelectPlace(place)
    }

    const handleSelectResult = (result: GeocodeResult) => {
        // A mutation made offline would wait, spinning, for the network; the web's request fails at once instead.
        if (!onlineManager.isOnline()) {
            showSnackbar(te('offline'))
            return
        }

        search.pickResult(result, {
            onPicked: handleSelectNew,
            onError: (error) => showSnackbar(te(getErrorKind(error))),
        })
    }

    const handleSubmit = () => {
        if (search.isPlacesView && placeList[0]) handleSelectPlace(placeList[0])
        else if (isQueryReady(search.query) && search.results[0]) handleSelectResult(search.results[0])
    }

    const renderStar = (id: number) =>
        isFavorite(places, id) ? (
            <Icon as={Star} className="size-3.5 text-favorite" fill={colors['favorite-fill']} />
        ) : null

    const renderRow = (id: number, label: string, countryCode: string, onPress: () => void, isDisabled = false) => (
        <Button key={id} variant="ghost" onPress={onPress} disabled={isDisabled} className={ROW}>
            <FlagIcon countryCode={countryCode} />
            <Text className="flex-1 text-sm font-normal" numberOfLines={1}>
                {label}
            </Text>
            {renderStar(id)}
        </Button>
    )

    const renderRows = (heading: string, rows: ReactNode) => (
        <View>
            <Text className="px-3 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground">{heading}</Text>
            <ScrollView className={ROWS} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {rows}
            </ScrollView>
        </View>
    )

    const getStatusText = (status: SearchStatus) => {
        switch (status) {
            case SearchStatus.Hint:
                return t('hint')
            case SearchStatus.Searching:
                return t('searching')
            case SearchStatus.Error:
                return te(getErrorKind(search.error))
            case SearchStatus.Offline:
                return te('offline')
            case SearchStatus.Empty:
                return t('empty')
        }
    }

    const renderStatus = (status: SearchStatus) => (
        <View className="flex-row items-center gap-2 p-3" accessible accessibilityLiveRegion="polite">
            {status === SearchStatus.Searching && <ActivityIndicator size="small" color={colors['muted-foreground']} />}
            <Text
                className={cn(
                    'shrink text-[0.8125rem] text-muted-foreground',
                    status === SearchStatus.Error && 'text-destructive',
                )}
            >
                {getStatusText(status)}
            </Text>
        </View>
    )

    // The hint stands alone: rows kept from a longer query would read as matches for the shorter one.
    const renderResults = () => (
        <View>
            {search.status && renderStatus(search.status)}
            {search.status !== SearchStatus.Hint &&
                search.results.length > 0 &&
                renderRows(
                    t('results'),
                    search.results.map((result) =>
                        renderRow(
                            result.id,
                            getResultLabel(result),
                            result.countryCode,
                            () => handleSelectResult(result),
                            search.isTracking,
                        ),
                    ),
                )}
        </View>
    )

    // Android's back first hides the keyboard, which leaves the field focused; losing the keyboard closes the list.
    useEffect(() => {
        if (!search.isOpen) return

        const keyboard = Keyboard.addListener('keyboardDidHide', () => inputRef.current?.blur())
        const back = BackHandler.addEventListener('hardwareBackPress', () => {
            inputRef.current?.blur()
            return true
        })

        return () => {
            keyboard.remove()
            back.remove()
        }
    }, [search.isOpen])

    return (
        <View>
            <View
                className={cn(
                    'h-12 flex-row items-center gap-2.5 rounded-lg border border-border bg-card pl-3.5 shadow-sm shadow-black/5',
                    search.isOpen && 'border-ring',
                )}
            >
                <Icon as={Search} className="size-4.5 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={search.query}
                    onChangeText={search.setQuery}
                    onFocus={() => search.setIsOpen(true)}
                    onBlur={dismiss}
                    onSubmitEditing={handleSubmit}
                    placeholder={t('placeholder')}
                    accessibilityLabel={t('label')}
                    autoFocus={autoFocus}
                    selectTextOnFocus={Boolean(initialQuery)}
                    autoCorrect={false}
                    returnKeyType="search"
                    className="h-full w-auto flex-1 rounded-none border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
                />
                {search.isTracking && <ActivityIndicator size="small" color={colors['muted-foreground']} />}
                {isLocateShown && (
                    <LocateButton onLocated={handleSelectNew} onSearch={() => inputRef.current?.focus()} />
                )}
            </View>
            {search.isListShown && (
                <View className="mt-1.5 overflow-hidden rounded-lg border border-border bg-popover shadow-lg shadow-black/5">
                    {search.isPlacesView
                        ? renderRows(
                              t('places'),
                              placeList.map((place) =>
                                  renderRow(place.id, getCityLabel(place, locale), place.countryCode, () =>
                                      handleSelectPlace(place),
                                  ),
                              ),
                          )
                        : renderResults()}
                </View>
            )}
        </View>
    )
}
