import { useQuota } from '@fa/api-client/hooks/useQuota'
import { LOCALES } from '@fa/shared/api'
import { ATTRIBUTION_URLS } from '@fa/shared/attribution'
import { formatClockTime, getCityName, getViewerTimeZone } from '@fa/shared/format'
import { LANGUAGE_NAMES } from '@fa/shared/languages'
import { getQuotaStatus } from '@fa/shared/quota'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { ChevronRight, ExternalLink } from 'lucide-react-native'
import { ReactNode, useSyncExternalStore } from 'react'
import { Linking, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Icon } from '../components/ui/icon'
import { Progress } from '../components/ui/progress'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Skeleton } from '../components/ui/skeleton'
import { Text } from '../components/ui/text'
import { usePlacedWidgetIds } from '../hooks/usePlacedWidgetIds'
import { useSettings } from '../hooks/useSettings'
import { LanguageSetting, settingsStore, THEME_SETTINGS } from '../lib/settings'
import { getLegalUrl, REPO_URL } from '../lib/web-links'
import { widgetBindings } from '../widget/widget-store'
import { redrawWidgets } from '../widget/widget-updates'

const LANGUAGE_SETTINGS: LanguageSetting[] = ['system', ...LOCALES]
const THEME_KEYS = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const
const SMALL = 'text-xs text-muted-foreground'
// The radio's own circle is small; its touch area fills the 36 px row without reaching into the next one.
const RADIO_HIT_SLOP = 10

const setLanguage = (value: string) => {
    const language = LANGUAGE_SETTINGS.find((option) => option === value)

    if (!language) return

    settingsStore.set((current) => ({ ...current, language }))
    void redrawWidgets()
}

const setTheme = (value: string) => {
    const theme = THEME_SETTINGS.find((option) => option === value)

    if (!theme) return

    settingsStore.set((current) => ({ ...current, theme }))
}

const openUrl = (url: string) => void Linking.openURL(url)

const renderLink = (url: string) => (chunks: ReactNode) => (
    <Text className={`${SMALL} underline`} onPress={() => openUrl(url)} role="link">
        {chunks}
    </Text>
)

interface SectionProps {
    title: string
    children: ReactNode
}

const Section = ({ title, children }: SectionProps) => (
    <Card className="gap-3 py-4">
        <CardHeader className="px-4">
            <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="gap-3 px-4">{children}</CardContent>
    </Card>
)

interface RadioRowProps {
    value: string
    label: string
    onSelect: (value: string) => void
}

// The radio carries the name for TalkBack; the label beside it takes taps without being read a second time.
const RadioRow = ({ value, label, onSelect }: RadioRowProps) => (
    <View className="min-h-9 flex-row items-center gap-3">
        <RadioGroupItem value={value} aria-label={label} hitSlop={RADIO_HIT_SLOP} />
        <Text accessible={false} onPress={() => onSelect(value)} className="flex-1 py-2 text-sm">
            {label}
        </Text>
    </View>
)

interface LinkRowProps {
    label: string
    onPress: () => void
    isExternal?: boolean
}

const LinkRow = ({ label, onPress, isExternal = false }: LinkRowProps) => (
    <Button variant="ghost" role="link" onPress={onPress} className="h-auto min-h-11 justify-between rounded-none px-0">
        <Text className="text-sm font-normal">{label}</Text>
        <Icon as={isExternal ? ExternalLink : ChevronRight} className="size-[1.125rem] text-muted-foreground" />
    </Button>
)

// Language and theme (kept on the device), the day's request quota, the widgets' cities and the legal links.
export function SettingsScreen() {
    const t = useTranslations('mobile')
    const tq = useTranslations('shell.quota')
    const tl = useTranslations('legal')
    const tn = useTranslations('nav')
    const tf = useTranslations('footer')
    const locale = useLocale()
    const router = useRouter()
    const settings = useSettings()
    const bindings = useSyncExternalStore(widgetBindings.subscribe, widgetBindings.get)
    const placedWidgetIds = usePlacedWidgetIds()

    const { data: quota } = useQuota()

    const quotaStatus = quota ? getQuotaStatus(quota) : null
    const quotaValue = quota && quotaStatus ? tq('value', { left: quotaStatus.left, limit: quota.limit }) : ''
    const version = Constants.expoConfig?.version ?? ''
    const repoUrl = REPO_URL

    return (
        <ScreenScroll className="bg-background" contentContainerClassName="gap-4 p-4">
            <Section title={t('language')}>
                <RadioGroup value={settings.language} onValueChange={setLanguage} aria-label={t('language')}>
                    {LANGUAGE_SETTINGS.map((option) => (
                        <RadioRow
                            key={option}
                            value={option}
                            label={option === 'system' ? t('languageSystem') : LANGUAGE_NAMES[option]}
                            onSelect={setLanguage}
                        />
                    ))}
                </RadioGroup>
            </Section>
            <Section title={t('theme')}>
                <RadioGroup value={settings.theme} onValueChange={setTheme} aria-label={t('theme')}>
                    {THEME_SETTINGS.map((option) => (
                        <RadioRow key={option} value={option} label={t(THEME_KEYS[option])} onSelect={setTheme} />
                    ))}
                </RadioGroup>
            </Section>
            <Section title={t('quota')}>
                {quota && quotaStatus ? (
                    <View className="gap-2">
                        {/* The bar below reads the same count to TalkBack. */}
                        <Text aria-hidden className="text-sm">
                            {quotaValue}
                        </Text>
                        <Progress
                            value={Math.round(quotaStatus.share * 100)}
                            aria-label={tq('label')}
                            getValueLabel={() => quotaValue}
                            className="h-1.5 bg-muted"
                            indicatorClassName={quotaStatus.isLow ? 'bg-warning' : 'bg-primary'}
                        />
                        <Text className={SMALL}>
                            {tq('resets', { time: formatClockTime(quota.resetsAt, getViewerTimeZone(), locale) })}
                        </Text>
                    </View>
                ) : (
                    // The same three lines as the answer, so nothing moves when it arrives.
                    <View className="gap-2">
                        <Skeleton className="h-5 w-[70%]" />
                        <Skeleton className="h-1.5 rounded-full" />
                        <Skeleton className="h-4 w-[40%]" />
                    </View>
                )}
            </Section>
            <Section title={t('widgets')}>
                {placedWidgetIds.length ? (
                    placedWidgetIds.map((widgetId) => {
                        const city = bindings[widgetId]

                        return (
                            <View key={widgetId} className="min-h-9 flex-row items-center gap-3">
                                <Text className="flex-1 text-sm" numberOfLines={2}>
                                    {t('widgetClock')}
                                    {': '}
                                    {city ? getCityName(city, locale) : t('widgetNoCity')}
                                </Text>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() =>
                                        router.push({ pathname: '/widget-city/[id]', params: { id: widgetId } })
                                    }
                                >
                                    <Text>{t('widgetChange')}</Text>
                                </Button>
                            </View>
                        )
                    })
                ) : (
                    <Text className="text-sm">{t('widgetsNone')}</Text>
                )}
                <Text className={SMALL}>{t('widgetsHint')}</Text>
            </Section>
            <Section title={t('about')}>
                <LinkRow label={tn('methodology')} onPress={() => router.push('/methodology')} />
                <LinkRow label={tl('privacy')} onPress={() => openUrl(getLegalUrl('privacy', locale))} isExternal />
                <LinkRow label={tl('terms')} onPress={() => openUrl(getLegalUrl('terms', locale))} isExternal />
                {repoUrl && <LinkRow label={tf('repo')} onPress={() => openUrl(repoUrl)} isExternal />}
                <Text className={SMALL}>
                    {tf.rich('attribution', {
                        openMeteo: renderLink(ATTRIBUTION_URLS.openMeteo),
                        metno: renderLink(ATTRIBUTION_URLS.metno),
                    })}
                </Text>
                <Text className={SMALL}>{t('version', { version })}</Text>
            </Section>
        </ScreenScroll>
    )
}
