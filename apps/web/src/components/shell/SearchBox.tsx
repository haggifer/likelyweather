'use client'

import { FlagIcon } from '@/components/shell/FlagIcon'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePlaces } from '@/hooks/usePlaces'
import { updatePlaces } from '@/lib/places-store'
import { useGeocode } from '@fa/api-client/hooks/useGeocode'
import { useTrackCity } from '@fa/api-client/hooks/useTrackCity'
import { GeocodeResult, Locale } from '@fa/shared/api'
import { getCityLabel } from '@fa/shared/format'
import { addRecent, getPlaceList, isFavorite, Place, Places, rankByFavorite, toPlace } from '@fa/shared/places'
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@fa/ui/components/command'
import { cn } from '@fa/ui/lib/cn'
import { Command as CommandPrimitive } from 'cmdk'
import { Loader2, Search, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

const MIN_QUERY = 3

const subscribeToNothing = () => () => {}

const getShortcutLabel = () =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K'

const getServerShortcutLabel = () => null

const byPopulation = (a: GeocodeResult, b: GeocodeResult) => (b.population ?? 0) - (a.population ?? 0)

const FavoriteMark = ({ places, id }: { places: Places | null; id: number }) =>
    places && isFavorite(places, id) ? (
        <Star className="size-3.5 shrink-0 fill-favorite text-favorite" aria-hidden="true" />
    ) : null

interface IProps {
    enableShortcut?: boolean
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
export function SearchBox({
    enableShortcut = false,
    initialQuery = '',
    autoFocus = false,
    onSelectCity,
    onDismiss,
    className,
}: IProps) {
    const t = useTranslations('search')
    const locale = useLocale() as Locale
    const router = useRouter()
    const shortcutLabel = useSyncExternalStore(subscribeToNothing, getShortcutLabel, getServerShortcutLabel)
    const places = usePlaces()

    const inputRef = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState(initialQuery)
    const [isOpen, setIsOpen] = useState(false)

    const isEdited = query !== initialQuery
    const debounced = useDebouncedValue(isEdited ? query.trim() : '', 200)
    const { data, isFetching, isError } = useGeocode(debounced, locale)
    const track = useTrackCity()

    const sorted = [...(data?.results ?? [])].sort(byPopulation)
    const results = places ? rankByFavorite(sorted, places) : sorted
    const isQueryReady = query.trim().length >= MIN_QUERY
    const isPlacesView = Boolean(places) && (!isEdited || !query.trim())
    const isListShown = isOpen && (isPlacesView || (isEdited && query.trim().length > 0))

    const closeList = () => {
        setIsOpen(false)
        setQuery('')
        inputRef.current?.blur()
    }

    const goToCity = (slug: string) => {
        if (onSelectCity) onSelectCity(slug)
        else router.push(`/city/${slug}`)
    }

    const handleSelect = (place: GeocodeResult) => {
        track.mutate(place.id, {
            onSuccess: ({ slug }) => {
                updatePlaces((current) => addRecent(current, toPlace({ ...place, slug })))
                closeList()
                goToCity(slug)
            },
            onError: (error) => {
                console.error(error)
                toast.error(t('trackFailed', { message: error.message }))
            },
        })
    }

    // A place in the list is already tracked and keeps its position, like a chip.
    const handleSelectPlace = (place: Place) => {
        closeList()
        goToCity(place.slug)
    }

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Escape') return

        setIsOpen(false)
        onDismiss?.()
    }

    const handleValueChange = (value: string) => {
        setQuery(value)
        setIsOpen(true)
    }

    const handleBlur = () =>
        setTimeout(() => {
            setIsOpen(false)
            onDismiss?.()
        }, 150)

    useEffect(() => {
        if (!autoFocus) return

        inputRef.current?.focus()
        inputRef.current?.select()
    }, [autoFocus])

    useEffect(() => {
        if (!enableShortcut) return

        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            }
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [enableShortcut])

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
                    value={query}
                    onValueChange={handleValueChange}
                    onFocus={() => setIsOpen(true)}
                    onBlur={handleBlur}
                    placeholder={t('placeholder')}
                    aria-label={t('label')}
                    className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {track.isPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                {enableShortcut && shortcutLabel && !track.isPending && (
                    <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground sm:inline">
                        {shortcutLabel}
                    </kbd>
                )}
            </div>
            {/* Always rendered, only hidden: the input's aria-controls points at this list. */}
            <div
                className={cn(
                    'absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-left shadow-lg',
                    !isListShown && 'hidden',
                )}
            >
                <CommandList>
                    {isPlacesView && places && (
                        <CommandGroup heading={t('places')}>
                            {getPlaceList(places).map((place) => (
                                <CommandItem
                                    key={place.id}
                                    value={`place-${place.id}`}
                                    onSelect={() => handleSelectPlace(place)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="flex items-center gap-2"
                                >
                                    <FlagIcon countryCode={place.countryCode} />
                                    <span className="truncate">{getCityLabel(place, locale)}</span>
                                    <FavoriteMark places={places} id={place.id} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {!isPlacesView && !isQueryReady && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">{t('hint')}</div>
                    )}
                    {!isPlacesView && isQueryReady && isFetching && !results.length && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> {t('searching')}
                        </div>
                    )}
                    {!isPlacesView && isQueryReady && isError && (
                        <div className="px-3 py-2 text-xs text-destructive">{t('error')}</div>
                    )}
                    {!isPlacesView && isQueryReady && !isFetching && !isError && (
                        <CommandEmpty>{t('empty')}</CommandEmpty>
                    )}
                    {!isPlacesView && results.length > 0 && (
                        <CommandGroup heading={t('results')}>
                            {results.map((place) => (
                                <CommandItem
                                    key={place.id}
                                    value={String(place.id)}
                                    onSelect={() => handleSelect(place)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    disabled={track.isPending}
                                    className="flex items-center gap-2"
                                >
                                    <FlagIcon countryCode={place.countryCode} />
                                    <span className="truncate">
                                        {[place.name, place.admin1, place.country].filter(Boolean).join(', ')}
                                    </span>
                                    <FavoriteMark places={places} id={place.id} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </div>
        </CommandPrimitive>
    )
}
