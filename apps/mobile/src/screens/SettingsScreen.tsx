import { useQuota } from '@fa/api-client/hooks/useQuota'
import { Locale, LOCALES } from '@fa/shared/api'
import { formatClockTime, getCityName, getViewerTimeZone } from '@fa/shared/format'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { Check, ChevronRight, ExternalLink } from 'lucide-react-native'
import { ReactNode, useSyncExternalStore } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { Card } from '../components/ui/Card'
import { useSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import { LanguageSetting, settingsStore, ThemeSetting } from '../lib/settings'
import { PRIVACY_URL, REPO_URL, TERMS_URL } from '../lib/web-links'
import { widgetBindings } from '../widget/widget-store'

// Each language by its own name, as in the web's language menu.
const LANGUAGE_NAMES: Record<Locale, string> = {
    [Locale.Uk]: 'Українська',
    [Locale.En]: 'English',
    [Locale.Es]: 'Español',
    [Locale.De]: 'Deutsch',
    [Locale.Fr]: 'Français',
}
const THEMES: ThemeSetting[] = ['system', 'light', 'dark']
const THEME_KEYS = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const
const LOW_SHARE = 0.2

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
    rowText: { flex: 1, fontSize: 15 },
    text: { fontSize: 14, lineHeight: 20 },
    small: { fontSize: 12, lineHeight: 17 },
    meter: { height: 6, borderRadius: 3, overflow: 'hidden' },
})

interface OptionProps {
    label: string
    isSelected: boolean
    onPress: () => void
}

const Option = ({ label, isSelected, onPress }: OptionProps) => {
    const { colors } = useTheme()

    return (
        <Pressable
            onPress={onPress}
            style={styles.row}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
        >
            <Text style={[styles.rowText, { color: colors.foreground }]}>{label}</Text>
            {isSelected && <Check size={18} color={colors.primary} />}
        </Pressable>
    )
}

interface LinkProps {
    label: string
    onPress: () => void
    isExternal?: boolean
}

const LinkRow = ({ label, onPress, isExternal = false }: LinkProps) => {
    const { colors } = useTheme()
    const Icon = isExternal ? ExternalLink : ChevronRight

    return (
        <Pressable onPress={onPress} style={styles.row} accessibilityRole="link">
            <Text style={[styles.rowText, { color: colors.foreground }]}>{label}</Text>
            <Icon size={18} color={colors['muted-foreground']} />
        </Pressable>
    )
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => <Card title={title}>{children}</Card>

// Language and theme (kept on the device), the day's request quota, the widgets' cities and the legal links.
export function SettingsScreen() {
    const t = useTranslations('mobile')
    const tq = useTranslations('shell.quota')
    const tl = useTranslations('legal')
    const tn = useTranslations('nav')
    const tf = useTranslations('footer')
    const tm = useTranslations('methodology')
    const locale = useLocale()
    const router = useRouter()
    const settings = useSettings()
    const { colors } = useTheme()
    const bindings = useSyncExternalStore(widgetBindings.subscribe, widgetBindings.get)

    const { data: quota } = useQuota()

    const widgetCities = [...new Set(Object.values(bindings).map((city) => getCityName(city, locale)))]
    const left = quota ? Math.max(0, quota.limit - quota.used) : null
    const share = quota && left !== null ? left / quota.limit : 1
    const version = Constants.expoConfig?.version ?? ''
    const repoUrl = REPO_URL

    const setLanguage = (language: LanguageSetting) => settingsStore.set((current) => ({ ...current, language }))
    const setTheme = (theme: ThemeSetting) => settingsStore.set((current) => ({ ...current, theme }))

    return (
        <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: colors.background }}>
            <Section title={t('language')}>
                <Option
                    label={t('languageSystem')}
                    isSelected={settings.language === 'system'}
                    onPress={() => setLanguage('system')}
                />
                {LOCALES.map((option) => (
                    <Option
                        key={option}
                        label={LANGUAGE_NAMES[option]}
                        isSelected={settings.language === option}
                        onPress={() => setLanguage(option)}
                    />
                ))}
            </Section>
            <Section title={t('theme')}>
                {THEMES.map((option) => (
                    <Option
                        key={option}
                        label={t(THEME_KEYS[option])}
                        isSelected={settings.theme === option}
                        onPress={() => setTheme(option)}
                    />
                ))}
            </Section>
            <Section title={t('quota')}>
                {quota && left !== null ? (
                    <View style={{ gap: 8 }} accessibilityLabel={tq('value', { left, limit: quota.limit })}>
                        <Text style={[styles.text, { color: colors.foreground }]}>
                            {tq('value', { left, limit: quota.limit })}
                        </Text>
                        <View style={[styles.meter, { backgroundColor: colors.muted }]}>
                            <View
                                style={{
                                    height: '100%',
                                    width: `${share * 100}%`,
                                    backgroundColor: share <= LOW_SHARE ? colors.warning : colors.primary,
                                }}
                            />
                        </View>
                        <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                            {tq('resets', {
                                time: formatClockTime(quota.resetsAt, getViewerTimeZone(), locale),
                            })}
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{tq('label')}</Text>
                )}
            </Section>
            <Section title={t('widgets')}>
                {widgetCities.length ? (
                    widgetCities.map((city) => (
                        <Text key={city} style={[styles.text, { color: colors.foreground }]}>
                            {t('widgetCity', { city })}
                        </Text>
                    ))
                ) : (
                    <Text style={[styles.text, { color: colors.foreground }]}>{t('widgetsNone')}</Text>
                )}
                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{t('widgetsHint')}</Text>
            </Section>
            <Section title={t('about')}>
                <LinkRow label={tn('methodology')} onPress={() => router.push('/methodology')} />
                <LinkRow label={tl('privacy')} onPress={() => void Linking.openURL(PRIVACY_URL)} isExternal />
                <LinkRow label={tl('terms')} onPress={() => void Linking.openURL(TERMS_URL)} isExternal />
                {repoUrl && <LinkRow label={tf('repo')} onPress={() => void Linking.openURL(repoUrl)} isExternal />}
                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{tm('attribution')}</Text>
                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{t('version', { version })}</Text>
            </Section>
        </ScrollView>
    )
}
