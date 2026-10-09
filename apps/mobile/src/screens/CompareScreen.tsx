import { useCompare } from '@fa/api-client/hooks/useCompare'
import { getEnsembleStats } from '@fa/chart-core/dashboard-stats'
import { getYDomain } from '@fa/chart-core/scales'
import { CompareResponse } from '@fa/shared/api'
import { MAX_COMPARE_CITIES, SEED_CITY_IDS } from '@fa/shared/constants'
import { getCityName } from '@fa/shared/format'
import { SEEDS, slugify } from '@fa/shared/seeds'
import { buildSlots, DASHBOARD_HOURS, getChartStart, toSlotLatest } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { SpaghettiChart } from '../components/charts/SpaghettiChart'
import { VariableSwitch } from '../components/city/VariableSwitch'
import { SearchBox } from '../components/home/SearchBox'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { FlagIcon } from '../components/ui/FlagIcon'
import { ScreenScroll } from '../components/ui/ScreenScroll'
import { Skeleton } from '../components/ui/Skeleton'
import { Text } from '../components/ui/Text'
import { useNow } from '../hooks/useNow'
import { useTheme } from '../hooks/useTheme'

type CompareItem = CompareResponse['items'][number]

const CHART_HEIGHT = 220

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16 },
    title: { fontSize: 24, fontWeight: '700' },
    text: { fontSize: 14 },
    small: { fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cityLink: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
    empty: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
})

const toCompareItem = (item: CompareItem, variable: Variable): CompareItem => ({
    ...item,
    latest:
        item.latest &&
        toSlotLatest(
            item.latest,
            buildSlots(getChartStart(item.latest, item.city.timezone), DASHBOARD_HOURS),
            VARIABLE_BY_ID[variable].aggregation,
        ),
})

const getSharedDomain = (items: CompareItem[], variable: Variable) =>
    items.length
        ? getYDomain(
              items.flatMap((i) => i.latest?.series.flatMap((s) => s.values) ?? []),
              variable,
          )
        : undefined

const SEED_SLUGS = SEED_CITY_IDS.slice(0, MAX_COMPARE_CITIES)
    .map((id) => SEEDS.find((seed) => seed.id === id))
    .filter((seed) => seed !== undefined)
    .map((seed) => slugify(seed.name, seed.countryCode, seed.id))

const parseSlugs = (raw: string | undefined) => (raw ? raw.split(',').filter(Boolean) : [])

interface PreviewProps {
    item: CompareItem & { latest: NonNullable<CompareItem['latest']> }
    variable: Variable
    yDomain?: [number, number]
}

const CityPreview = ({ item, variable, yDomain }: PreviewProps) => {
    const locale = useLocale()
    const now = useNow()

    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const stats = useMemo(() => getEnsembleStats(item.latest), [item.latest])

    return (
        <SpaghettiChart
            steps={item.latest.steps}
            series={item.latest.series}
            stats={stats}
            variable={variable}
            timeZone={item.city.timezone}
            locale={locale}
            accessibilityLabel={getCityName(item.city, locale)}
            hoverIndex={hoverIndex}
            onHoverIndex={setHoverIndex}
            now={now}
            height={CHART_HEIGHT}
            yDomain={yDomain}
            compact
            showTooltip
        />
    )
}

// Up to four cities on one shared vertical axis; the list lives in the route (`?cities=`), like the web's URL.
export function CompareScreen() {
    const t = useTranslations('compare')
    const te = useTranslations('errors')
    const locale = useLocale()
    const router = useRouter()
    const { colors } = useTheme()
    const params = useLocalSearchParams<{ cities?: string }>()

    const [variable, setVariable] = useState(Variable.Temp)

    const shown = parseSlugs(params.cities).slice(0, MAX_COMPARE_CITIES)
    const { data, error, isFetching, refetch } = useCompare(shown, variable)

    const items = useMemo(() => (data?.items ?? []).map((item) => toCompareItem(item, variable)), [data, variable])
    const sharedDomain = useMemo(() => getSharedDomain(items, variable), [items, variable])
    const isSettled = !isFetching && (Boolean(data) || Boolean(error))

    const setSlugs = (slugs: string[]) => router.setParams({ cities: slugs.join(',') })
    const handleAdd = (slug: string) => setSlugs([...shown.filter((s) => s !== slug), slug])
    const handleRemove = (slug: string) => setSlugs(shown.filter((s) => s !== slug))

    const renderBody = (item: CompareItem | undefined) => {
        if (item?.latest)
            return <CityPreview item={{ ...item, latest: item.latest }} variable={variable} yDomain={sharedDomain} />

        if (!item && !isSettled) return <Skeleton height={CHART_HEIGHT} />

        return (
            <View style={styles.empty}>
                <Text style={[styles.text, { color: colors['muted-foreground'], textAlign: 'center' }]}>
                    {item || error ? t('noForecast') : te('notFound')}
                </Text>
            </View>
        )
    }

    return (
        <ScreenScroll
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor: colors.background }}
        >
            <View style={{ gap: 4 }}>
                <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
                    {t('title')}
                </Text>
                <Text style={[styles.text, { color: colors['muted-foreground'] }]}>{t('description')}</Text>
            </View>
            <VariableSwitch value={variable} onChange={setVariable} />
            {shown.length < MAX_COMPARE_CITIES && <SearchBox onSelectCity={handleAdd} />}
            <View style={styles.row}>
                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>
                    {t('count', { count: shown.length, max: MAX_COMPARE_CITIES })}
                </Text>
                {!shown.length && <Button variant="outline" label={t('seed')} onPress={() => setSlugs(SEED_SLUGS)} />}
            </View>
            {!shown.length && (
                <Text style={[styles.text, { color: colors['muted-foreground'], textAlign: 'center' }]}>
                    {t('empty')}
                </Text>
            )}
            {error && <ErrorNotice error={error} onRetry={() => void refetch()} />}
            {shown.map((slug) => {
                const item = items.find((i) => i.city.slug === slug)

                return (
                    <Card key={slug} style={isFetching && { opacity: 0.7 }}>
                        <View style={styles.row}>
                            <Pressable
                                onPress={() => item && router.push(`/city/${slug}`)}
                                accessibilityRole="link"
                                style={styles.cityLink}
                            >
                                {item && <FlagIcon countryCode={item.city.countryCode} />}
                                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                                    {item ? getCityName(item.city, locale) : slug}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleRemove(slug)}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel={t('remove')}
                            >
                                <X size={20} color={colors['muted-foreground']} />
                            </Pressable>
                        </View>
                        {renderBody(item)}
                    </Card>
                )
            })}
            {shown.length > 1 && (
                <Text style={[styles.small, { color: colors['muted-foreground'] }]}>{t('sharedAxis')}</Text>
            )}
        </ScreenScroll>
    )
}
