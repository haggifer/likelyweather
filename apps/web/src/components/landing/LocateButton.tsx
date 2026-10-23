'use client'

import { Button } from '@/components/ui/button'
import { PositionError, useNearestCity } from '@/hooks/useNearestCity'
import { getErrorKind } from '@fa/api-client/error-kind'
import { getLocateFarValues } from '@fa/shared/locate'
import { Place, toPlace } from '@fa/shared/places'
import { Loader2, LocateFixed } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface IProps {
    onLocated: (place: Place) => void
    onSearch: () => void
}

// "Use my location": the nearest stored city opens when it is close enough; farther away the viewer is told how far
// and chooses. The browser is only asked on a tap, never on load.
export function LocateButton({ onLocated, onSearch }: IProps) {
    const t = useTranslations('search')
    const te = useTranslations('errors')
    const locale = useLocale()

    const nearest = useNearestCity()

    const handleLocate = () =>
        nearest.mutate(undefined, {
            onSuccess: (result) => {
                if (result.kind === 'open') {
                    onLocated(result.place)
                    return
                }

                toast(t('locateFar', getLocateFarValues(result.city, result.distanceKm, locale)), {
                    action: { label: t('locateUse'), onClick: () => onLocated(toPlace(result.city)) },
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
            className="touch:size-9"
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
