import { adjustArchiveRange, ARCHIVE_FIRST_DATE, ARCHIVE_MAX_DAYS, ArchiveRange } from '@fa/shared/archive'
import { DAY_MS } from '@fa/shared/constants'
import { Minus, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { getFontFamily } from '../../theme/fonts'
import { Button } from '../ui/Button'
import { Text } from '../ui/Text'

type RangeEnd = 'from' | 'to'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const DATE_LENGTH = 10

const styles = StyleSheet.create({
    picker: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { width: 48, fontSize: 12, fontWeight: '500' },
    input: {
        flex: 1,
        minHeight: 40,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 14,
        fontFamily: getFontFamily('400'),
        fontVariant: ['tabular-nums'],
        textAlign: 'center',
    },
    limit: { fontSize: 12 },
})

const shiftDate = (dateKey: string, days: number) =>
    new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

// A real calendar day: the pattern alone lets 2026-02-31 through.
const isDateKey = (text: string) =>
    DATE_KEY.test(text) && !Number.isNaN(Date.parse(text)) && shiftDate(text, 0) === text

// The number pad has no dash, so the dashes are put in while the reader types the digits.
const toDateText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)

    return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-')
}

interface FieldProps {
    end: RangeEnd
    value: string
    latest: string
    onChange: (end: RangeEnd, value: string) => void
}

// The field keeps what the reader types until it is a whole date; a date set from outside (a button, the other end
// dragging this one along) replaces it.
const DateField = ({ end, value, latest, onChange }: FieldProps) => {
    const t = useTranslations('archive')
    const { colors, radius } = useTheme()

    const [draft, setDraft] = useState(value)
    const [previousValue, setPreviousValue] = useState(value)

    if (previousValue !== value) {
        setPreviousValue(value)
        setDraft(value)
    }

    const label = t(end)

    const handleText = (text: string) => {
        const next = toDateText(text)

        setDraft(next)

        if (isDateKey(next)) onChange(end, next)
    }
    const handleBlur = () => setDraft(value)

    return (
        <View style={styles.row}>
            <Text
                style={[styles.label, { color: colors['muted-foreground'] }]}
                importantForAccessibility="no"
                accessibilityElementsHidden
            >
                {label}
            </Text>
            <Button
                icon={Minus}
                variant="outline"
                onPress={() => onChange(end, shiftDate(value, -1))}
                isDisabled={value <= ARCHIVE_FIRST_DATE}
                accessibilityLabel={`${label} −1`}
            />
            <TextInput
                value={draft}
                onChangeText={handleText}
                onBlur={handleBlur}
                keyboardType="number-pad"
                maxLength={DATE_LENGTH}
                accessibilityLabel={label}
                style={[
                    styles.input,
                    {
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderRadius: radius * 0.8,
                    },
                ]}
            />
            <Button
                icon={Plus}
                variant="outline"
                onPress={() => onChange(end, shiftDate(value, 1))}
                isDisabled={value >= latest}
                accessibilityLabel={`${label} +1`}
            />
        </View>
    )
}

interface IProps {
    range: ArchiveRange
    latest: string
    onChange: (range: ArchiveRange) => void
}

// Two dates, up to 12 days apart, from 1940 to yesterday (`ARCHIVE_MAX_DAYS`): moving one end drags the other along
// when the period would grow past the limit, so the period is always one the API accepts. Typed dates and a day
// earlier or later on the buttons stand in for the web's date inputs, which would need a native date picker here.
export function ArchivePeriodPicker({ range, latest, onChange }: IProps) {
    const t = useTranslations('archive')
    const { colors } = useTheme()

    const handleChange = (end: RangeEnd, value: string) =>
        onChange(adjustArchiveRange({ ...range, [end]: value }, end, latest))

    return (
        <View style={styles.picker} role="group" accessibilityLabel={t('period')}>
            <DateField end="from" value={range.from} latest={latest} onChange={handleChange} />
            <DateField end="to" value={range.to} latest={latest} onChange={handleChange} />
            <Text style={[styles.limit, { color: colors['muted-foreground'] }]}>
                {t('limit', { days: ARCHIVE_MAX_DAYS })}
            </Text>
        </View>
    )
}
