'use client'

import { adjustArchiveRange, ARCHIVE_FIRST_DATE, ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { useTranslations } from 'next-intl'
import { ChangeEvent } from 'react'

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

const INPUT =
    'h-9 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-10'

// Two dates, up to 12 days apart, from 1940 to yesterday (`ARCHIVE_MAX_DAYS`): moving one end drags the other along
// when the period would grow past the limit, so the period is always one the API accepts.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')

    const handleFrom = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) onChange(adjustArchiveRange({ ...range, from: e.target.value }, 'from', latest))
    }
    const handleTo = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) onChange(adjustArchiveRange({ ...range, to: e.target.value }, 'to', latest))
    }

    return (
        <fieldset className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <legend className="sr-only">{t('period')}</legend>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                {t('from')}
                <input
                    type="date"
                    min={ARCHIVE_FIRST_DATE}
                    max={latest}
                    value={range.from}
                    onChange={handleFrom}
                    className={INPUT}
                />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                {t('to')}
                <input
                    type="date"
                    min={ARCHIVE_FIRST_DATE}
                    max={latest}
                    value={range.to}
                    onChange={handleTo}
                    className={INPUT}
                />
            </label>
            <p className="pb-2 text-xs text-muted-foreground">{t('limit', { days: ARCHIVE_MAX_DAYS })}</p>
        </fieldset>
    )
}
