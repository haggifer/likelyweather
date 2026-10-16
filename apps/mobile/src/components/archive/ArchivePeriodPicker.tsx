import { ArchiveRange, formatArchiveRange } from '@fa/shared/archive'
import type { TriggerRef } from '@rn-primitives/popover'
import { CalendarDays } from 'lucide-react-native'
import { useRef } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Text } from '../ui/text'
import { ArchiveRangeCalendar } from './ArchiveRangeCalendar'

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// The web's period picker: DD.MM.YYYY – DD.MM.YYYY on a button that opens the range calendar. The second tap of a
// period applies it and closes the calendar, so each period costs at most one request.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')

    const triggerRef = useRef<TriggerRef>(null)

    const period = formatArchiveRange(range)

    const handleChange = (next: ArchiveRange) => {
        triggerRef.current?.close()
        onChange(next)
    }

    return (
        <Popover>
            <PopoverTrigger ref={triggerRef} asChild>
                <Button
                    variant="outline"
                    size="sm"
                    accessibilityLabel={t('periodValue', { range: period })}
                    className="h-10"
                >
                    <Icon as={CalendarDays} />
                    <Text className="text-sm">{period}</Text>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
                <ArchiveRangeCalendar range={range} latest={latest} onChange={handleChange} />
            </PopoverContent>
        </Popover>
    )
}
