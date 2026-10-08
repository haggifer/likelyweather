'use client'

import { Button } from '@/components/ui/button'
import { PositionError, useNearestCity } from '@/hooks/useNearestCity'
import { getErrorKind } from '@fa/api-client/error-kind'
import { City, Locale } from '@fa/shared/api'
import { getCityName } from '@fa/shared/format'
import { formatDistanceKm, isNearEnough } from '@fa/shared/geo'
import { Loader2, LocateFixed } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface IProps {
    onSelect: (city: City) => void
    onSearch: () => void
}

// "Use my location": the nearest stored city opens when it is close enough; farther away the viewer is told how far
// and chooses. The browser is only asked on a tap, never on load.
export function LocateButton({ onSelect, onSearch }: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale

    const nearest = useNearestCity()

    const handleLocate = () =>
        nearest.mutate(undefined, {
            onSuccess: ({ city, distanceKm }) => {
                if (isNearEnough(distanceKm)) {
                    onSelect(city)
                    return
                }

                toast(t('locateFar', { name: getCityName(city, locale), km: formatDistanceKm(distanceKm, locale) }), {
                    action: { label: t('locateUse'), onClick: () => onSelect(city) },
                    cancel: { label: t('locateSearch'), onClick: onSearch },
                })
            },
            onError: (error) => {
                if (error instanceof PositionError) {
                    toast(t('locateUnavailable'))
                    return
                }

                console.error(error)
                toast.error(te(getErrorKind(error)))
            },
        })

    return (
        <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-9"
            onClick={handleLocate}
            disabled={nearest.isPending}
            aria-busy={nearest.isPending}
            aria-label={t('locate')}
            title={t('locate')}
        >
            {nearest.isPending ? <Loader2 className="animate-spin" /> : <LocateFixed />}
        </Button>
    )
}
