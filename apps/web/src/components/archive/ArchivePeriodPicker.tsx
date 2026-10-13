'use client'

import { ArchiveRangeCalendar } from '@/components/archive/ArchiveRangeCalendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverPanel, PopoverTrigger } from '@/components/ui/popover'
import { ArchiveRange, formatArchiveRange } from '@fa/shared/archive'
import { CalendarDays } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { I18nProvider } from 'react-aria/I18nProvider'

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The period as DD.MM.YYYY – DD.MM.YYYY on a button that opens the range calendar. The second tap of a period applies
// it and closes the calendar, so each period costs at most one request and nothing waits for the reader to settle.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()

    const [isOpen, setIsOpen] = useState(false)

    const period = formatArchiveRange(range)

    const handleChange = (next: ArchiveRange) => {
        setIsOpen(false)
        onChange(next)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('periodValue', { range: period })}
                    className="tabular-nums pointer-coarse:h-10"
                >
                    <CalendarDays />
                    {period}
                </Button>
            </PopoverTrigger>
            <PopoverPanel align="start" className="w-auto">
                <I18nProvider locale={locale}>
                    <ArchiveRangeCalendar range={range} latest={latest} onChange={handleChange} />
                </I18nProvider>
            </PopoverPanel>
        </Popover>
    )
}
