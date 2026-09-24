'use client'

import FlagIcon from '@/components/shell/FlagIcon'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useGeocode, useTrackCity } from '@/hooks/queries'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { GeocodeResult, Locale } from '@/shared/api'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface IProps {
    variant?: 'bar' | 'hero'
    enableShortcut?: boolean
    className?: string
}

const MIN_QUERY = 3

const formatPopulation = (population: number | undefined, locale: string) =>
    population ? new Intl.NumberFormat(locale, { notation: 'compact' }).format(population) : null

export default function SearchBox({ variant = 'bar', enableShortcut = false, className }: IProps) {
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
                router.push(`/city/${slug}`)
            },
            onError: (error) => {
                console.error(error)
                toast.error(t('trackFailed', { message: error.message }))
            },
        })
    }

    return (
        <Command
            shouldFilter={false}
            className={cn(
                'relative overflow-visible bg-transparent p-0',
                variant === 'hero' ? 'w-full max-w-xl' : 'w-60 transition-[width] focus-within:w-80 max-sm:w-40',
                className,
            )}
            onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        >
            <CommandInput
                ref={inputRef}
                value={query}
                onValueChange={(v) => {
                    setQuery(v)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                placeholder={enableShortcut ? t('placeholderShortcut') : t('placeholder')}
                aria-label={t('label')}
                className={variant === 'hero' ? 'h-11 text-base' : undefined}
            />
            {isOpen && query.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg">
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
                                            {track.isPending && track.variables === place.id ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                                formatPopulation(place.population, locale)
                                            )}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </div>
            )}
        </Command>
    )
}
