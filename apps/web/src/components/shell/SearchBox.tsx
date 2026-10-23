'use client'

import { LocateButton } from '@/components/landing/LocateButton'
import { FlagIcon } from '@/components/shell/FlagIcon'
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { usePlaces } from '@/hooks/usePlaces'
import { cn } from '@/lib/cn'
import { updatePlaces } from '@/lib/places-store'
import { getErrorKind } from '@fa/api-client/error-kind'
import { useCitySearch } from '@fa/hooks/useCitySearch'
import { GeocodeResult, Locale } from '@fa/shared/api'
import { getResultLabel, SearchStatus } from '@fa/shared/city-search'
import { getCityLabel } from '@fa/shared/format'
import { addRecent, getPlaceList, isFavorite, Place, Places } from '@fa/shared/places'
import { Command as CommandPrimitive } from 'cmdk'
import { Loader2, Search, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from 'react'
import { toast } from 'sonner'

const STATUS = 'px-3 py-2 text-xs text-muted-foreground max-sm:text-[0.8125rem]'
const GROUP = 'max-sm:**:[[cmdk-group-heading]]:text-[0.8125rem]'

const FavoriteMark = ({ places, id }: { places: Places | null; id: number }) =>
    places && isFavorite(places, id) ? (
        <Star className="size-3.5 shrink-0 fill-favorite-fill text-favorite" aria-hidden="true" />
    ) : null

interface IProps {
    isLocateShown?: boolean
    initialQuery?: string
    autoFocus?: boolean
    onSelectCity?: (slug: string) => void
    onDismiss?: () => void
    className?: string
}

// Selecting a place tracks it, records it as the newest recent place, and then hands the slug to `onSelectCity`;
// without a handler the box navigates to the city dashboard. While the text is empty or untouched, the box offers the
// viewer's places instead. With an `initialQuery` (the current city) the text starts selected, so
// typing replaces it, and results only appear once it has been edited. `onDismiss` fires on Escape and on blur.
// `isLocateShown` adds the "Use my location" button, whose city is already stored and so needs no tracking.
export function SearchBox({
    isLocateShown = false,
    initialQuery = '',
    autoFocus = false,
    onSelectCity,
    onDismiss,
    className,
}: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale
    const router = useRouter()
    const places = usePlaces()

    const inputRef = useRef<HTMLInputElement>(null)

    const search = useCitySearch({ initialQuery, locale, places })

    const closeList = () => {
        search.setIsOpen(false)
        search.setQuery('')
        inputRef.current?.blur()
    }

    const goToCity = (slug: string) => {
        if (onSelectCity) onSelectCity(slug)
        else router.push(`/city/${slug}`)
    }

    // A place in the list is already tracked and keeps its position, like a chip.
    const handleSelectPlace = (place: Place) => {
        closeList()
        goToCity(place.slug)
    }

    const handleSelectNew = (place: Place) => {
        updatePlaces((current) => addRecent(current, place))
        handleSelectPlace(place)
    }

    const handleSelectResult = (result: GeocodeResult) =>
        search.pickResult(result, {
            onPicked: handleSelectNew,
            onError: (error) => {
                console.error(error)
                toast.error(te(getErrorKind(error)))
            },
        })

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Escape') return

        search.setIsOpen(false)
        onDismiss?.()
    }

    const handleValueChange = (value: string) => {
        search.setQuery(value)
        search.setIsOpen(true)
    }

    const handleBlur = () =>
        setTimeout(() => {
            search.setIsOpen(false)
            onDismiss?.()
        }, 150)

    const renderStatus = () => {
        switch (search.status) {
            case SearchStatus.Hint:
                return <div className={STATUS}>{t('hint')}</div>
            case SearchStatus.Searching:
                return (
                    <div className={cn(STATUS, 'flex items-center gap-2')}>
                        <Loader2 className="size-3.5 animate-spin" /> {t('searching')}
                    </div>
                )
            case SearchStatus.Error:
                return <div className={cn(STATUS, 'text-destructive')}>{te(getErrorKind(search.error))}</div>
            case SearchStatus.Offline:
                return <div className={STATUS}>{te('offline')}</div>
            case SearchStatus.Empty:
                return <CommandEmpty>{t('empty')}</CommandEmpty>
            default:
                return null
        }
    }

    useEffect(() => {
        if (!autoFocus) return

        inputRef.current?.focus()
        inputRef.current?.select()
    }, [autoFocus])

    return (
        <CommandPrimitive
            shouldFilter={false}
            className={cn('relative w-full max-w-xl', className)}
            onKeyDown={handleKeyDown}
        >
            <div className="flex h-12 items-center gap-2.5 rounded-lg border bg-card px-3.5 shadow-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
                <Search className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <CommandPrimitive.Input
                    ref={inputRef}
                    value={search.query}
                    onValueChange={handleValueChange}
                    onFocus={() => search.setIsOpen(true)}
                    onBlur={handleBlur}
                    placeholder={t('placeholder')}
                    aria-label={t('label')}
                    className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {search.isTracking && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                {isLocateShown && (
                    <LocateButton onLocated={handleSelectNew} onSearch={() => inputRef.current?.focus()} />
                )}
            </div>
            {/* Always rendered, only hidden: the input's aria-controls points at this list. */}
            <div
                className={cn(
                    'absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-left shadow-lg',
                    !search.isListShown && 'hidden',
                )}
            >
                {/* Phones show five rows (heading, 5 × 2 rem, padding), so the keyboard never covers an option. */}
                <CommandList className="max-sm:max-h-[12.25rem]">
                    {search.isPlacesView && places && (
                        <CommandGroup heading={t('places')} className={GROUP}>
                            {getPlaceList(places).map((place) => (
                                <CommandItem
                                    key={place.id}
                                    value={`place-${place.id}`}
                                    onSelect={() => handleSelectPlace(place)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="flex items-center gap-2 touch:min-h-9"
                                >
                                    <FlagIcon countryCode={place.countryCode} />
                                    <span className="truncate">{getCityLabel(place, locale)}</span>
                                    <FavoriteMark places={places} id={place.id} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {!search.isPlacesView && renderStatus()}
                    {!search.isPlacesView && search.results.length > 0 && (
                        <CommandGroup heading={t('results')} className={GROUP}>
                            {search.results.map((result) => (
                                <CommandItem
                                    key={result.id}
                                    value={String(result.id)}
                                    onSelect={() => handleSelectResult(result)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    disabled={search.isTracking}
                                    className="flex items-center gap-2 touch:min-h-9"
                                >
                                    <FlagIcon countryCode={result.countryCode} />
                                    <span className="truncate">{getResultLabel(result)}</span>
                                    <FavoriteMark places={places} id={result.id} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </div>
        </CommandPrimitive>
    )
}
