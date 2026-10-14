'use client'

import { CityHeader } from '@/components/city/CityHeader'
import { ErrorNotice } from '@/components/shell/ErrorNotice'
import { SearchBox } from '@/components/shell/SearchBox'
import { Skeleton } from '@/components/ui/skeleton'
import { isNotFound } from '@fa/api-client/api'
import { useCity } from '@fa/api-client/hooks/useCity'
import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'

interface IProps {
    slug: string
    children: ReactNode
}

export function CityShell({ slug, children }: IProps) {
    const t = useTranslations('city')

    const { data: city, error, refetch } = useCity(slug)

    if (error && isNotFound(error)) {
        return (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
                <h1 className="text-xl font-semibold">{t('notFound')}</h1>
                <p className="text-sm text-muted-foreground">{t('notFoundBody')}</p>
                <SearchBox />
            </div>
        )
    }

    if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} className="py-16" />

    if (!city) {
        return (
            // The header (name with star and pencil, then Refresh, which phones show only for an outdated run), the
            // switch and the chart.
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-8 w-64 max-sm:w-44" />
                    <Skeleton className="size-7 pointer-coarse:size-9 max-sm:ml-auto" />
                    <Skeleton className="size-7 pointer-coarse:size-9" />
                </div>
                <Skeleton className="h-7 w-24 self-end pointer-coarse:h-9 max-sm:hidden" />
                <Skeleton className="h-9 w-full sm:w-96" />
                <Skeleton className="h-[25rem] w-full max-sm:h-[37.5rem]" />
            </div>
        )
    }

    return (
        <>
            <CityHeader city={city} />
            {children}
        </>
    )
}
