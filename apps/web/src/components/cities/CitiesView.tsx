'use client'

import FlagIcon from '@/components/shell/FlagIcon'
import StatusChip, { ChipTone } from '@/components/shell/StatusChip'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCities } from '@/hooks/queries'
import { formatTime, getCityName } from '@/lib/format'
import { CityStatus } from '@/shared/api'
import { sortBy } from 'es-toolkit'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

const STATUS_TONES: Record<CityStatus, ChipTone> = {
    [CityStatus.Active]: 'ok',
    [CityStatus.Dormant]: 'muted',
    [CityStatus.Queued]: 'warn',
}

export default function CitiesView() {
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
                                                <span className="font-normal text-muted-foreground">{c.country}</span>
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
                                        <TableCell className="text-right">{c.availableModels.length || '–'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t('note')}</p>
        </div>
    )
}
