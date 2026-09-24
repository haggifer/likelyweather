'use client'

import FlagIcon from '@/components/shell/FlagIcon'
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { useGeocode, useTrackCity } from '@/hooks/queries'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { GeocodeResult, Locale } from '@/shared/api'
import { Command as CommandPrimitive } from 'cmdk'
import { Loader2, Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface IProps {
    enableShortcut?: boolean
    onSelectCity?: (slug: string) => void
    className?: string
}

const MIN_QUERY = 3

const formatPopulation = (population: number | undefined, locale: string) =>
    population ? new Intl.NumberFormat(locale, { notation: 'compact' }).format(population) : null

// Selecting a place tracks it (guide §2.3) and then hands the slug to `onSelectCity`; without a handler the
// box navigates to the city dashboard.
export default function SearchBox({ enableShortcut = false, onSelectCity, className }: IProps) {
    const t = useTranslations('search')
    const locale = useLocale() as Locale
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const debounced = useDebouncedValue(query.trim(), 200)
    const { data, isFetching, isError } = useGeocode(debounced, locale)
    const track = useTrackCity()
    const results = [...(data?.results ?? [])].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    const isQueryReady = query.trim().length >= MIN_QUERY

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

    const handleSelect = (place: GeocodeResult) => {
        track.mutate(place.id, {
            onSuccess: ({ slug }) => {
                setIsOpen(false)
                setQuery('')
                inputRef.current?.blur()

                if (onSelectCity) onSelectCity(slug)
                else router.push(`/city/${slug}`)
            },
            onError: (error) => {
                console.error(error)
                toast.error(t('trackFailed', { message: error.message }))
            },
        })
    }

    return (
        <CommandPrimitive
            shouldFilter={false}
            className={cn('relative w-full max-w-xl', className)}
            onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        >
            <div className="flex h-12 items-center gap-2.5 rounded-lg border bg-card px-3.5 shadow-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
                <Search className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <CommandPrimitive.Input
                    ref={inputRef}
                    value={query}
                    onValueChange={(v) => {
                        setQuery(v)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                    placeholder={t('placeholder')}
                    aria-label={t('label')}
                    className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {track.isPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                {enableShortcut && !track.isPending && (
                    <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                        Ctrl K
                    </kbd>
                )}
            </div>
            {isOpen && query.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-left shadow-lg">
                    <CommandList>
                        {!isQueryReady && <div className="px-3 py-2 text-xs text-muted-foreground">{t('hint')}</div>}
                        {isQueryReady && isFetching && !results.length && (
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" /> {t('searching')}
                            </div>
                        )}
                        {isQueryReady && isError && (
                            <div className="px-3 py-2 text-xs text-destructive">{t('error')}</div>
                        )}
                        {isQueryReady && !isFetching && !isError && <CommandEmpty>{t('empty')}</CommandEmpty>}
                        {results.length > 0 && (
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
                                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                                            {formatPopulation(place.population, locale)}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </div>
            )}
        </CommandPrimitive>
    )
}
