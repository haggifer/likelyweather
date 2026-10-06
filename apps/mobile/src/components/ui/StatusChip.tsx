import { StyleSheet, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

export type ChipTone = 'ok' | 'warn' | 'fail'

const TONE_COLORS = { ok: 'success', warn: 'warning', fail: 'destructive' } as const

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

// The web's .fa-chip: the tone's colour at 14 % as the fill, the tone itself as the text.
export function StatusChip({ tone, label }: IProps) {
    const { colors } = useTheme()

    const color = colors[TONE_COLORS[tone]]

    return <Text style={[styles.chip, { color, backgroundColor: `${color}24` }]}>{label}</Text>
}
