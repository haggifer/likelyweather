'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSpread } from '@fa/shared/dashboard'
import { DayDisagreement } from '@fa/shared/ensemble'
import { formatDateKey, formatNumber } from '@fa/shared/format'
import { DISAGREEMENT_TONE } from '@fa/shared/status-tone'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    days: DayDisagreement[]
    variable: Variable
}

export function DisagreementTiles({ days, variable }: IProps) {
    const t = useTranslations('disagreement')
    const tInline = useTranslations('variablesInline')
    const locale = useLocale()
    const { unit, decimals, disagreement } = VARIABLE_BY_ID[variable]

    return (
        <Card className="gap-3">
            <CardHeader>
                <CardTitle className="font-semibold">{t('title')}</CardTitle>
                <CardDescription>
                    {t(variable === Variable.Precip ? 'descriptionPrecip' : 'description', {
                        variable: tInline(variable),
                        agree: formatNumber(disagreement.agree, 1),
                        split: formatNumber(disagreement.split, 1),
                        unit,
                    })}
                </CardDescription>
            </CardHeader>
            {/* One row of days sharing the card's width; where 4.75 rem each (5.625 rem on phones) do not fit, the row scrolls
                sideways, so the region must be reachable and named for keyboard and screen-reader users. Margins rather than
                the card's padding keep its scrollbar as wide as the tiles. */}
            <CardContent
                tabIndex={days.length > 0 ? 0 : undefined}
                role={days.length > 0 ? 'region' : undefined}
                aria-label={days.length > 0 ? t('title') : undefined}
                className="mx-(--card-spacing) flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-md px-0 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {days.map((d) => (
                    <div
                        key={d.day}
                        className="flex min-w-19 flex-1 shrink-0 snap-start flex-col gap-1.5 rounded-md border p-2 max-sm:min-w-[5.625rem] max-sm:items-center max-sm:text-center"
                    >
                        <span className="text-xs text-muted-foreground">
                            {formatDateKey(d.day, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-lg leading-none font-semibold" title={t('spreadTitle')}>
                            {formatSpread(d.spread, decimals)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
                        </span>
                        <Badge
                            variant={DISAGREEMENT_TONE[d.label]}
                            className="self-start max-sm:w-full max-sm:self-stretch"
                        >
                            {t(d.label)}
                        </Badge>
                    </div>
                ))}
                {!days.length && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
            </CardContent>
        </Card>
    )
}
