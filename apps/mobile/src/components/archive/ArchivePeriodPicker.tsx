import { ArchiveRange, formatArchiveRange } from '@fa/shared/archive'
import { CalendarDays } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'
import { ArchiveRangeCalendar } from './ArchiveRangeCalendar'

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The second tap of a period applies it and closes the calendar, so each period costs at most one request.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')

    const [isOpen, setIsOpen] = useState(false)

    const period = formatArchiveRange(range)

    const handleChange = (next: ArchiveRange) => {
        setIsOpen(false)
        onChange(next)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    accessibilityLabel={t('periodValue', { range: period })}
                    className="h-9"
                >
                    <Icon as={CalendarDays} />
                    <Text className="text-sm">{period}</Text>
                </Button>
            </DialogTrigger>
            <DialogContent accessibilityLabel={t('period')}>
                <ArchiveRangeCalendar range={range} latest={latest} onChange={handleChange} />
            </DialogContent>
        </Dialog>
    )
}
