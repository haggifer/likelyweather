'use client'

import { FlagIcon } from '@/components/shell/FlagIcon'
import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { useCities } from '@/hooks/useCities'
import { CityStatus } from '@fa/shared/api'
import { formatTime, getCityName } from '@fa/shared/format'
import { Card, CardContent } from '@fa/ui/components/card'
import { Skeleton } from '@fa/ui/components/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@fa/ui/components/table'
import { sortBy } from 'es-toolkit'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

const STATUS_TONES: Record<CityStatus, ChipTone> = {
    [CityStatus.Active]: 'ok',
    [CityStatus.Dormant]: 'muted',
    [CityStatus.Queued]: 'warn',
}

export function CitiesView() {
    const t = useTranslations('cities')
    const tc = useTranslations('city')
    const locale = useLocale()
    const { data } = useCities()
    const cities = sortBy(data?.items ?? [], [(c) => -c.viewCount, (c) => c.name])
    const formatDate = (iso: string) =>
        formatTime(iso, 'UTC', locale, { day: 'numeric', month: 'short', year: 'numeric' })

    return (
        <div className="flex flex-col gap-(--card-gap)">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <Card>
                <CardContent>
                    {!data ? (
                        <Skeleton className="h-64" />
                    ) : (
                        <>
                            <ul aria-label={t('title')} className="flex flex-col gap-2 sm:hidden">
                                {cities.map((c) => (
                                    <li
                                        key={c.id}
                                        className="flex flex-col gap-1.5 rounded-md border p-3 text-[0.8125rem]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <Link
                                                href={`/city/${c.slug}`}
                                                className="flex min-w-0 items-center gap-2 font-medium hover:underline"
                                            >
                                                <FlagIcon countryCode={c.countryCode} />
                                                <span className="truncate">{getCityName(c, locale)}</span>
                                            </Link>
                                            <StatusChip tone={STATUS_TONES[c.status]}>
                                                {tc(`status.${c.status}`)}
                                            </StatusChip>
                                        </div>
                                        <span className="text-muted-foreground">{c.country}</span>
                                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                                            <dt className="text-muted-foreground">{t('firstTracked')}</dt>
                                            <dd>{formatDate(c.firstTrackedAt)}</dd>
                                            <dt className="text-muted-foreground">{t('lastViewed')}</dt>
                                            <dd>{formatDate(c.lastViewedAt)}</dd>
                                            <dt className="text-muted-foreground">{t('views')}</dt>
                                            <dd>{c.viewCount}</dd>
                                            <dt className="text-muted-foreground">{t('runs')}</dt>
                                            <dd>{c.runsCollected}</dd>
                                            <dt className="text-muted-foreground">{t('models')}</dt>
                                            <dd>{c.availableModels.length || '–'}</dd>
                                        </dl>
                                    </li>
                                ))}
                            </ul>
                            <div className="max-sm:hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('city')}</TableHead>
                                            <TableHead>{t('status')}</TableHead>
                                            <TableHead>{t('firstTracked')}</TableHead>
                                            <TableHead>{t('lastViewed')}</TableHead>
                                            <TableHead className="text-right">{t('views')}</TableHead>
                                            <TableHead className="text-right">{t('runs')}</TableHead>
                                            <TableHead className="text-right">{t('models')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cities.map((c) => (
                                            <TableRow key={c.id} className="h-(--row-height)">
                                                <TableCell>
                                                    <Link
                                                        href={`/city/${c.slug}`}
                                                        className="flex items-center gap-2 font-medium hover:underline"
                                                    >
                                                        <FlagIcon countryCode={c.countryCode} />
                                                        {getCityName(c, locale)}
                                                        <span className="font-normal text-muted-foreground">
                                                            {c.country}
                                                        </span>
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusChip tone={STATUS_TONES[c.status]}>
                                                        {tc(`status.${c.status}`)}
                                                    </StatusChip>
                                                </TableCell>
                                                <TableCell>{formatDate(c.firstTrackedAt)}</TableCell>
                                                <TableCell>{formatDate(c.lastViewedAt)}</TableCell>
                                                <TableCell className="text-right">{c.viewCount}</TableCell>
                                                <TableCell className="text-right">{c.runsCollected}</TableCell>
                                                <TableCell className="text-right">
                                                    {c.availableModels.length || '–'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t('note')}</p>
        </div>
    )
}
