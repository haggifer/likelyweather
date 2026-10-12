'use client'

import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSpread } from '@fa/chart-core/dashboard-stats'
import { DayDisagreement, DisagreementLabel } from '@fa/shared/ensemble'
import { formatDateKey, formatNumber } from '@fa/shared/format'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useLocale, useTranslations } from 'next-intl'

const TONES: Record<DisagreementLabel, ChipTone> = { agree: ChipTone.Ok, mixed: ChipTone.Warn, split: ChipTone.Fail }

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
            {/* The tiles scroll sideways, so the region must be reachable and named for keyboard/screen-reader users. */}
            <CardContent
                tabIndex={days.length > 0 ? 0 : undefined}
                role={days.length > 0 ? 'region' : undefined}
                aria-label={days.length > 0 ? t('title') : undefined}
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-md pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {days.map((d) => (
                    <div key={d.day} className="flex w-28 shrink-0 snap-start flex-col gap-1.5 rounded-md border p-2.5">
                        <span className="text-xs text-muted-foreground">
                            {formatDateKey(d.day, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-lg leading-none font-semibold" title={t('spreadTitle')}>
                            {formatSpread(d.spread, decimals)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
                        </span>
                        <StatusChip tone={TONES[d.label]} className="self-start">
                            {t(d.label)}
                        </StatusChip>
                    </div>
                ))}
                {!days.length && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
            </CardContent>
        </Card>
    )
}
