import { StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { mixColors, withAlpha } from '../../theme/color-mix'
import { Text } from './Text'

// A union rather than an enum, so the tone maps elsewhere in the app keep their string values.
export type ChipTone = 'ok' | 'info' | 'warn' | 'fail' | 'muted'

const TONE_COLORS = {
    ok: 'success',
    info: 'info',
    warn: 'warning',
    fail: 'destructive',
    muted: 'muted-foreground',
} as const
const FILL_SHARE = 0.14
const TEXT_SHARE = 0.75

const styles = StyleSheet.create({
    chip: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 2,
        fontSize: 12,
        fontWeight: '600',
        overflow: 'hidden',
    },
})

interface IProps {
    tone: ChipTone
    label: string
}

// The web's .fa-chip: the tone at 14 % as the fill, and the tone mixed 75 % into the foreground as the text, which
// keeps the text readable on the tinted fill in both themes.
export function StatusChip({ tone, label }: IProps) {
    const { colors } = useTheme()

    const color = colors[TONE_COLORS[tone]]

    return (
        <Text
            isTabular
            style={[
                styles.chip,
                {
                    color: mixColors(color, colors.foreground, TEXT_SHARE),
                    backgroundColor: withAlpha(color, FILL_SHARE),
                },
            ]}
        >
            {label}
        </Text>
    )
}
