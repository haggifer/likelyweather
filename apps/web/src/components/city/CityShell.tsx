'use client'

import { CityHeader } from '@/components/city/CityHeader'
import { SearchBox } from '@/components/shell/SearchBox'
import { useCity } from '@/hooks/useCity'
import { Skeleton } from '@fa/ui/components/skeleton'
import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'

interface IProps {
    slug: string
    children: ReactNode
}

export function CityShell({ slug, children }: IProps) {
    const t = useTranslations('city')

    const { data: city, error } = useCity(slug)

    if (error) {
        return (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
                <h1 className="text-xl font-semibold">{t('notTracked')}</h1>
                <p className="text-sm text-muted-foreground">{t('notTrackedBody')}</p>
                <SearchBox />
            </div>
        )
    }

    if (!city) {
        return (
            <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="mt-4 h-[23.75rem] w-full" />
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
