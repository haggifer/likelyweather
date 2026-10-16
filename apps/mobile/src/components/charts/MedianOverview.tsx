import {
    AXIS_HEIGHT,
    getHoverDots,
    getOverviewContentWidth,
    getOverviewFrame,
    getOverviewLayout,
    getPanelHeight,
    getPanelScale,
    HOVER_STRIP,
    OVERVIEW_MARGIN_RIGHT,
    OVERVIEW_PHONE_SIZE,
    ROW_GAP,
} from '@fa/chart-core/overview-geometry'
import {
    getExtraReadout,
    getPanelReadoutIndex,
    getPanelSeries,
    getPrecipUnitKey,
    getValueAt,
} from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { getNowX } from '@fa/chart-core/plot-geometry'
import { getInitialScrollLeft, getLabelX, getVisibleRange } from '@fa/chart-core/scroll-geometry'
import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { formatNumber, formatStepLabel } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useTranslations } from 'use-intl'
import { useChartScroll } from '../../hooks/useChartScroll'
import { useLayoutWidth } from '../../hooks/useLayoutWidth'
import { useTheme } from '../../hooks/useTheme'
import { Skeleton } from '../ui/skeleton'
import { Text } from '../ui/text'
import { OverviewCanvas } from './OverviewCanvas'
import { TapSurface } from './TapSurface'
import { OverviewSelection } from './types'

// The web's phone layout: readouts in a two-column grid above, the reader's panels stacked below in the same order,
// each named inside its panel.
const {
    heights: PANEL_HEIGHTS,
    marginLeft: MARGIN_LEFT,
    hoverLabelHalfWidth: HOVER_LABEL_HALF_WIDTH,
} = OVERVIEW_PHONE_SIZE
// The canvas follows the offset every frame, so the scroll view reports every frame.
const SCROLL_THROTTLE_MS = 16
// The web's phone grid: two equal columns with the gap between them; an odd last readout keeps to its column.
const READOUTS_CLASS = 'flex-row flex-wrap gap-2'
// Centred in its row, like the web's grid cell next to a taller one (Pressure beside Precipitation's second line).
const SKELETON_READOUT_CLASS = 'h-[3.5625rem] max-w-[50%] grow basis-2/5'
const SKELETON_PANELS_STYLE = { gap: ROW_GAP, paddingTop: HOVER_STRIP, paddingBottom: AXIS_HEIGHT }
const READOUT_CLASS = 'max-w-[50%] grow basis-2/5 justify-center border-l-2 border-border pr-1 pl-3'
const LABEL_CLASS = 'text-sm font-medium text-muted-foreground'
const VALUE_CLASS = 'text-xl leading-tight font-semibold'
const EXTRA_CLASS = 'text-xs text-muted-foreground'

// The scroll view only scrolls and takes taps; its content is an empty view as wide as the plot, which the canvas
// behind it draws.
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

interface SkeletonProps {
    panels: PanelVariable[]
    // The archive's precipitation panel has no chance-of-rain strip.
    isArchive?: boolean
}

// The web's phone skeleton: a block per readout, then a block per panel at its height in the chart's frame.
export function MedianOverviewSkeleton({ panels, isArchive = false }: SkeletonProps) {
    return (
        <View className="gap-3" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View className={READOUTS_CLASS}>
                {panels.map((variable) => (
                    <Skeleton key={variable} className={SKELETON_READOUT_CLASS} />
                ))}
            </View>
            <View style={SKELETON_PANELS_STYLE}>
                {panels.map((variable) => (
                    <Skeleton
                        key={variable}
                        style={{
                            height: getPanelHeight(PANEL_HEIGHTS, variable, !isArchive),
                            marginLeft: MARGIN_LEFT,
                            marginRight: OVERVIEW_MARGIN_RIGHT,
                        }}
                    />
                ))}
            </View>
        </View>
    )
}

interface IProps {
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    series: OverviewMedians
    directions: (number | null)[] | null
    // The share of models above 0.2 mm per slot; the archive has one series and passes none.
    chance: (number | null)[] | null
    timeZone: string
    locale: string
    now: Date | null
    accessibilityLabel: string
    // Past weather, hour by hour: precipitation reads as the hour from the step.
    isArchive?: boolean
}

// Median of all models for every panel's variable on one axis of local 3-hour slots; a precipitation bar is the amount
// of the 3 hours after its slot, and the strip under the bars the share of models above 0.2 mm in it. The readouts
// follow the finger, or the slot nearest to now. The archive draws a city's past weather the same way, every hour and
// narrower, without a now line or a chance of rain, opening at its first hour.
export function MedianOverview({
    panels,
    series,
    directions,
    chance,
    timeZone,
    locale,
    now,
    accessibilityLabel,
    isArchive = false,
}: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')
    const tc = useTranslations('chart')
    const tcity = useTranslations('city')
    const { chart } = useTheme()
    const { width, onLayout } = useLayoutWidth()

    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const [viewLeft, setViewLeft] = useState(0)
    const scrollX = useSharedValue(0)

    const hasChance = chance !== null
    const layout = useMemo(() => getOverviewLayout(PANEL_HEIGHTS, panels, hasChance), [panels, hasChance])
    const axisSteps = getPanelSeries(series, panels[0]).steps
    const times = useMemo(() => axisSteps.map((s) => new Date(s)), [axisSteps])
    const contentWidth = getOverviewContentWidth(width, times.length, MARGIN_LEFT, isArchive)
    const frame = useMemo(
        () => getOverviewFrame(times, MARGIN_LEFT, contentWidth, isArchive),
        [times, contentWidth, isArchive],
    )
    const { x, plotRight, slotWidth } = frame
    const nowX = getNowX(x, now, MARGIN_LEFT, plotRight)
    const scales = useMemo(() => layout.rows.map((row) => getPanelScale(row, series)), [layout, series])
    const initialScrollLeft = getInitialScrollLeft(now ? x(now) : null, {
        slotWidth,
        insetLeft: MARGIN_LEFT,
        contentWidth,
        viewportWidth: width,
    })
    const visibleRange = getVisibleRange(viewLeft, width, [MARGIN_LEFT, OVERVIEW_MARGIN_RIGHT])
    const selection: OverviewSelection | null =
        hoverIndex === null
            ? null
            : {
                  x: x(times[hoverIndex]),
                  labelX: getLabelX(x(times[hoverIndex]), visibleRange, HOVER_LABEL_HALF_WIDTH),
                  label: formatStepLabel(axisSteps[hoverIndex], timeZone, locale),
                  dots: getHoverDots(layout.rows, scales, series, axisSteps[hoverIndex]),
              }
    const panelNames = layout.rows.map(({ variable }) => `${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}`)

    const { ref: scrollRef, onContentSizeChange } = useChartScroll(axisSteps[0], initialScrollLeft)
    const handleScroll = useAnimatedScrollHandler((e) => scrollX.set(e.contentOffset.x))

    // The picked time's label clamps to the part of the chart on screen when it was picked.
    const handleSelect = (touchX: number) => {
        setHoverIndex(getNearestIndex(times, x.invert(touchX)))
        setViewLeft(scrollX.get())
    }

    return (
        <View className="gap-3">
            <View className={READOUTS_CLASS}>
                {layout.rows.map(({ variable }) => {
                    const info = VARIABLE_BY_ID[variable]
                    const index = getPanelReadoutIndex(variable, times, hoverIndex, now)
                    const value = getValueAt(getPanelSeries(series, variable), axisSteps[index])
                    const extra = getExtraReadout(variable, series, chance, axisSteps[index], index)

                    return (
                        <View key={variable} className={READOUT_CLASS}>
                            <Text className={LABEL_CLASS}>{tv(variable)}</Text>
                            <Text className={VALUE_CLASS}>
                                {formatNumber(value, info.decimals)}
                                <Text className="text-sm font-normal text-muted-foreground">
                                    {' '}
                                    {variable === Variable.Precip
                                        ? t(getPrecipUnitKey(isArchive, hoverIndex === null), {
                                              unit: info.unit,
                                              hours: SLOT_HOURS,
                                          })
                                        : info.unit}
                                </Text>
                            </Text>
                            {extra && (
                                <Text className={EXTRA_CLASS}>
                                    {t('secondary', {
                                        name: extra.variable ? tv(extra.variable) : tcity('chanceOfRain'),
                                        value: extra.value,
                                        unit: extra.unit,
                                    })}
                                </Text>
                            )}
                        </View>
                    )
                })}
            </View>
            <View
                onLayout={onLayout}
                style={{ height: layout.totalHeight }}
                accessible
                accessibilityRole="image"
                accessibilityLabel={accessibilityLabel}
            >
                {width > 0 && (
                    <>
                        <OverviewCanvas
                            width={width}
                            scrollX={scrollX}
                            layout={layout}
                            series={series}
                            scales={scales}
                            frame={frame}
                            marginLeft={MARGIN_LEFT}
                            times={times}
                            directions={directions}
                            chance={chance}
                            nowX={nowX}
                            nowLabel={hoverIndex === null ? tc('now') : ''}
                            selection={selection}
                            panelNames={panelNames}
                            timeZone={timeZone}
                            locale={locale}
                            chart={chart}
                        />
                        <AnimatedScrollView
                            testID="overview-scroll"
                            ref={scrollRef}
                            horizontal
                            onContentSizeChange={onContentSizeChange}
                            onScroll={handleScroll}
                            scrollEventThrottle={SCROLL_THROTTLE_MS}
                        >
                            <TapSurface onSelect={handleSelect}>
                                <View
                                    testID="overview-plot"
                                    style={{ width: contentWidth, height: layout.totalHeight }}
                                />
                            </TapSurface>
                        </AnimatedScrollView>
                    </>
                )}
            </View>
        </View>
    )
}
