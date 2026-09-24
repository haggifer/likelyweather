'use client'

import UpdatedChip from '@/components/city/UpdatedChip'
import VariableSwitch from '@/components/city/VariableSwitch'
import FlagIcon from '@/components/shell/FlagIcon'
import StatusChip from '@/components/shell/StatusChip'
import { formatTime, getCityName, getCountryName } from '@/lib/format'
import { CityDetail, CityStatus } from '@/shared/api'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    city: CityDetail
}

export default function CityHeader({ city }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    return (
        <div className="mb-(--card-gap) flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
                        <FlagIcon countryCode={city.countryCode} className="h-4 w-6" />
                        {getCityName(city, locale)}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {[city.admin1, getCountryName(city.countryCode, city.country, locale)]
                            .filter(Boolean)
                            .join(', ')}{' '}
                        · {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° ·{' '}
                        {t('trackedSince', {
                            date: formatTime(city.firstTrackedAt, city.timezone, locale, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            }),
                        })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {city.isPreviewOnly && (
                        <StatusChip tone="info" title={t('previewTitle')}>
                            {t('preview')}
                        </StatusChip>
                    )}
                    {city.status !== CityStatus.Active && (
                        <StatusChip tone="warn">{t(`status.${city.status}`)}</StatusChip>
                    )}
                    <UpdatedChip slug={city.slug} className="lg:hidden" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <VariableSwitch />
            </div>
            <VariableSwitch className="hidden lg:flex xl:hidden" />
        </div>
    )
}
