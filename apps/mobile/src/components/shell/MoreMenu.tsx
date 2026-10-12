import { Href, useRouter } from 'expo-router'
import { Archive, BookOpen, LucideIcon, Menu, Settings } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../ui/Text'

interface Anchor {
    top: number
    right: number
}

interface MenuItem {
    key: 'archive' | 'methodology' | 'settings'
    icon: LucideIcon
    href: Href
}

const ITEMS: MenuItem[] = [
    { key: 'archive', icon: Archive, href: '/archive' },
    { key: 'methodology', icon: BookOpen, href: '/methodology' },
    { key: 'settings', icon: Settings, href: '/settings' },
]
const GAP = 4

const styles = StyleSheet.create({
    trigger: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    menu: {
        position: 'absolute',
        minWidth: 192,
        paddingVertical: 4,
        borderWidth: StyleSheet.hairlineWidth,
        boxShadow: '0 8px 24px -8px rgba(15, 23, 42, 0.3)',
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12 },
    label: { fontSize: 14 },
})

// The web header's pages (the Archive, then Methodology), on every screen's header; Settings joins them because the app
// has no top-bar controls for language and theme.
export function MoreMenu() {
    const t = useTranslations('nav')
    const tm = useTranslations('mobile')
    const router = useRouter()
    const { width } = useWindowDimensions()
    const { colors, radius } = useTheme()

    const triggerRef = useRef<View>(null)
    const [anchor, setAnchor] = useState<Anchor | null>(null)

    const labels = { archive: t('archive'), methodology: t('methodology'), settings: tm('settings') }

    // The menu hangs from the button wherever the header puts it.
    const handleOpen = () =>
        triggerRef.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + GAP, right: width - x - w }))
    const handleClose = () => setAnchor(null)
    const handleNavigate = (href: Href) => {
        setAnchor(null)
        router.push(href)
    }

    return (
        <>
            <Pressable
                ref={triggerRef}
                onPress={handleOpen}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t('more')}
                accessibilityState={{ expanded: Boolean(anchor) }}
                style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.6 }]}
            >
                <Menu size={22} color={colors.foreground} />
            </Pressable>
            <Modal
                visible={Boolean(anchor)}
                transparent
                animationType="fade"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={handleClose}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessible={false} />
                {anchor && (
                    <View
                        accessibilityRole="menu"
                        style={[
                            styles.menu,
                            {
                                top: anchor.top,
                                right: anchor.right,
                                backgroundColor: colors.popover,
                                borderColor: colors.border,
                                borderRadius: radius,
                            },
                        ]}
                    >
                        {ITEMS.map(({ key, icon: Icon, href }) => (
                            <Pressable
                                key={key}
                                onPress={() => handleNavigate(href)}
                                accessibilityRole="menuitem"
                                style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.muted }]}
                            >
                                <Icon size={16} color={colors['muted-foreground']} />
                                <Text style={[styles.label, { color: colors['popover-foreground'] }]}>
                                    {labels[key]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </Modal>
        </>
    )
}
