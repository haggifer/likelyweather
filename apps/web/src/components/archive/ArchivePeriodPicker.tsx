'use client'

import {
    adjustArchiveRange,
    ARCHIVE_FIRST_DATE,
    ARCHIVE_MAX_DAYS,
    ArchiveRange,
    isArchiveDate,
} from '@fa/shared/archive'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

type RangeEnd = 'from' | 'to'

const INPUT =
    'h-9 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-10'
const ENDS: RangeEnd[] = ['from', 'to']

// Two dates, up to 12 days apart, from 1940 to yesterday (`ARCHIVE_MAX_DAYS`): moving one end drags the other along
// when the period would grow past the limit, so the period is always one the API accepts. A field keeps what the
// reader types (Chrome reports `0002-10-05` while the year is typed) until it is a date the archive has, and drops it
// on blur.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')

    const [drafts, setDrafts] = useState<Partial<Record<RangeEnd, string>>>({})

    const handleChange = (end: RangeEnd, value: string) => {
        if (!isArchiveDate(value, latest)) {
            setDrafts((d) => ({ ...d, [end]: value }))
            return
        }

        setDrafts((d) => ({ ...d, [end]: undefined }))
        onChange(adjustArchiveRange({ ...range, [end]: value }, end, latest))
    }
    const handleBlur = (end: RangeEnd) => setDrafts((d) => ({ ...d, [end]: undefined }))

    return (
        <fieldset className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <legend className="sr-only">{t('period')}</legend>
            {ENDS.map((end) => (
                <label key={end} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    {t(end)}
                    <input
                        type="date"
                        min={ARCHIVE_FIRST_DATE}
                        max={latest}
                        value={drafts[end] ?? range[end]}
                        onChange={(e) => handleChange(end, e.target.value)}
                        onBlur={() => handleBlur(end)}
                        className={INPUT}
                    />
                </label>
            ))}
            <p className="pb-2 text-xs text-muted-foreground">{t('limit', { days: ARCHIVE_MAX_DAYS })}</p>
        </fieldset>
    )
}
