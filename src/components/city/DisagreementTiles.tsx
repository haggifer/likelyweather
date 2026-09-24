'use client'

import StatusChip, { ChipTone } from '@/components/shell/StatusChip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatTime } from '@/lib/format'
import { DayDisagreement, DisagreementLabel } from '@/shared/ensemble'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    days: DayDisagreement[]
    variable: Variable
}

const TONES: Record<DisagreementLabel, ChipTone> = { agree: 'ok', mixed: 'warn', split: 'fail' }

export default function DisagreementTiles({ days, variable }: IProps) {
    const t = useTranslations('disagreement')
    const tv = useTranslations('variables')
    const locale = useLocale()
    const { unit, decimals, disagreement } = VARIABLE_BY_ID[variable]

    return (
        <Card className="gap-3">
            <CardHeader>
                <CardTitle className="font-semibold">{t('title')}</CardTitle>
                <CardDescription>
                    {t(variable === Variable.Precip ? 'descriptionPrecip' : 'description', {
                        variable: tv(variable).toLowerCase(),
                        agree: formatNumber(disagreement.agree, 1),
                        split: formatNumber(disagreement.split, 1),
                        unit,
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                {days.map((d) => (
                    <div key={d.day} className="flex flex-col gap-1.5 rounded-md border p-2.5">
                        <span className="text-xs text-muted-foreground">
                            {formatTime(`${d.day}T12:00:00Z`, 'UTC', locale, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                            })}
                        </span>
                        <span className="text-lg leading-none font-semibold" title={t('spreadTitle')}>
                            {formatNumber(d.spread, decimals === 0 ? 1 : decimals)}
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
