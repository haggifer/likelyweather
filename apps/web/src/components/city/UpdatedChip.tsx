'use client'

import { Hint } from '@/components/shell/Hint'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { getForecastAge, getForecastTitleValues } from '@fa/shared/forecast-age'
import { ClockAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    issueTime: string
    fetchedAt: string
    timeZone: string
    now: Date | null
    // The overview card's phone row has room for icons only: a warning clock, its age in the hint.
    isIconOnPhones?: boolean
    className?: string
}

// How long ago the data on screen was fetched, the moment the chart starts at, shown once it is REFRESH_AFTER_HOURS
// old (when Refresh turns on). An age reads the same in every time zone, unlike a clock time that is the city's; the
// run's times, city and UTC, are in its hint (a tooltip, or a tap on touch screens).
export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, isIconOnPhones = false, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const { hours, isShown, isStale, tone } = getForecastAge(fetchedAt, now)

    if (!isShown) return null

    const age = t('forecastAge', { hours })
    const title = t('forecastTitle', getForecastTitleValues(issueTime, fetchedAt, timeZone, locale))
    const details = isStale ? `${title} ${t('forecastOldTitle')}` : title

    return (
        <Hint
            content={
                isIconOnPhones ? (
                    // The phone's warning clock tells only its age; the badge beside it on wider screens keeps the
                    // run's times.
                    <>
                        <span className="sm:hidden">{age}</span>
                        <span className="max-sm:hidden">{details}</span>
                    </>
                ) : (
                    details
                )
            }
        >
            {/* The chip is the hint's trigger, so the badge sits inside a button. */}
            <Button
                variant="ghost"
                aria-label={isIconOnPhones ? age : undefined}
                className={cn(
                    'h-auto shrink-0 rounded-full border-0 p-0 hover:bg-transparent touch:min-h-9 touch:hit-area dark:hover:bg-transparent',
                    isIconOnPhones && 'max-sm:size-9',
                    className,
                )}
            >
                <Badge variant={tone} className={cn('h-7', isIconOnPhones && 'max-sm:hidden')}>
                    {age}
                </Badge>
                {isIconOnPhones && <ClockAlert aria-hidden="true" className="size-4 text-warning sm:hidden" />}
            </Button>
        </Hint>
    )
}
