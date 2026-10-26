'use client'

import { ArchiveRangeCalendar } from '@/components/archive/ArchiveRangeCalendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverPanel, PopoverTrigger } from '@/components/ui/popover'
import { useIsPhone } from '@/hooks/useIsPhone'
import { ArchiveRange, formatArchiveRange } from '@fa/shared/archive'
import { CalendarDays } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { I18nProvider } from 'react-aria/I18nProvider'

// The calendar focuses the period's day itself, as a date picker should, rather than its first button.
const keepCalendarFocus = (event: Event) => event.preventDefault()

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The second tap of a period applies it and closes the calendar, so each period costs at most one request and nothing
// waits for the reader to settle. Phones open it in a dialog, which has the window's whole height: beside the button it
// doesn't fit a phone held sideways.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const locale = useLocale()
    const isPhone = useIsPhone()

    const [isOpen, setIsOpen] = useState(false)

    const period = formatArchiveRange(range)

    const handleChange = (next: ArchiveRange) => {
        setIsOpen(false)
        onChange(next)
    }

    const trigger = (
        <Button
            variant="outline"
            size="sm"
            aria-label={t('periodValue', { range: period })}
            className="tabular-nums touch:h-9 max-sm:text-sm"
        >
            <CalendarDays />
            {period}
        </Button>
    )
    const calendar = (
        <I18nProvider locale={locale}>
            <ArchiveRangeCalendar range={range} latest={latest} onChange={handleChange} />
        </I18nProvider>
    )

    if (isPhone) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent aria-describedby={undefined} onOpenAutoFocus={keepCalendarFocus}>
                    <DialogTitle className="sr-only">{t('period')}</DialogTitle>
                    {calendar}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverPanel align="start" className="w-auto" onOpenAutoFocus={keepCalendarFocus}>
                {calendar}
            </PopoverPanel>
        </Popover>
    )
}
