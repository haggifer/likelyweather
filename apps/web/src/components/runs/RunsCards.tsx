'use client'

import { formatRunDuration, getRunOriginLabel, RunArchiveLink, STATUS_TONES } from '@/components/runs/run-parts'
import { StatusChip } from '@/components/shell/StatusChip'
import { Run } from '@fa/shared/api'
import { formatUtc } from '@fa/shared/format'
import { Button } from '@fa/ui/components/button'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface IProps {
    runs: Run[]
    cityNames: Map<number, string>
}

// Up to 500 runs arrive at once; a phone renders them in pages instead of one long list.
const PAGE_SIZE = 30

export function RunsCards({ runs, cityNames }: IProps) {
    const t = useTranslations('runs')
    const locale = useLocale()
    const [count, setCount] = useState(PAGE_SIZE)
    const rest = runs.length - count

    if (!runs.length) return <p className="p-6 text-center text-sm text-muted-foreground">{t('empty')}</p>

    return (
        <div className="flex flex-col gap-2">
            <ul aria-label={t('tableTitle')} className="flex flex-col gap-2">
                {runs.slice(0, count).map((run) => (
                    <li key={run.id} className="flex flex-col gap-1.5 rounded-md border p-3 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{formatUtc(run.issueTime, locale)} UTC</span>
                            <StatusChip tone={STATUS_TONES[run.status]}>{t(`statuses.${run.status}`)}</StatusChip>
                        </div>
                        <span className="text-muted-foreground">{getRunOriginLabel(run, t, cityNames)}</span>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                            <dt className="text-muted-foreground">{t('rows')}</dt>
                            <dd>{run.rows.toLocaleString(locale)}</dd>
                            <dt className="text-muted-foreground">{t('cities')}</dt>
                            <dd>{run.citiesCount}</dd>
                            <dt className="text-muted-foreground">{t('warnings')}</dt>
                            <dd className="min-w-0 wrap-anywhere">
                                {run.warnings.length ? run.warnings.join('; ') : '0'}
                            </dd>
                            <dt className="text-muted-foreground">{t('duration')}</dt>
                            <dd>{formatRunDuration(run)}</dd>
                            <dt className="text-muted-foreground">{t('archive')}</dt>
                            <dd>
                                <RunArchiveLink run={run} />
                            </dd>
                        </dl>
                    </li>
                ))}
            </ul>
            {rest > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCount((c) => c + PAGE_SIZE)}>
                    {t('showMore', { count: Math.min(rest, PAGE_SIZE) })}
                </Button>
            )}
        </div>
    )
}
