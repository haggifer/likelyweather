import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSnackbar } from '../../hooks/useSnackbar'
import { useTheme } from '../../hooks/useTheme'
import { dismissSnackbar, SnackbarAction } from '../../lib/snackbar-store'
import { Text } from '../legacy-ui/Text'

const MARGIN = 16

const styles = StyleSheet.create({
    snackbar: {
        position: 'absolute',
        left: MARGIN,
        right: MARGIN,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 8,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 6,
        borderWidth: StyleSheet.hairlineWidth,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.18)',
    },
    message: { flexGrow: 1, flexShrink: 1, flexBasis: '60%', fontSize: 14, lineHeight: 20, paddingVertical: 8 },
    actions: { flexDirection: 'row', marginLeft: 'auto' },
    action: { minHeight: 36, paddingHorizontal: 10, justifyContent: 'center' },
    actionLabel: { fontSize: 14, fontWeight: '600' },
})

const handleAction = (id: number, action: SnackbarAction) => {
    dismissSnackbar(id)
    action.onPress()
}

// Mounted once over every screen, above the navigation bar. TalkBack reads a new message without moving focus,
// like the web's toasts.
export function SnackbarHost() {
    const snackbar = useSnackbar()
    const insets = useSafeAreaInsets()
    const { colors, radius } = useTheme()

    if (!snackbar) return null

    return (
        <View
            key={snackbar.id}
            accessibilityLiveRegion="polite"
            style={[
                styles.snackbar,
                {
                    bottom: insets.bottom + MARGIN,
                    backgroundColor: colors.popover,
                    borderColor: colors.border,
                    borderRadius: radius,
                },
            ]}
        >
            <Text style={[styles.message, { color: colors['popover-foreground'] }]}>{snackbar.message}</Text>
            {snackbar.actions.length > 0 && (
                <View style={styles.actions}>
                    {snackbar.actions.map((action) => (
                        <Pressable
                            key={action.label}
                            onPress={() => handleAction(snackbar.id, action)}
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
                        >
                            <Text style={[styles.actionLabel, { color: colors.primary }]}>{action.label}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    )
}
