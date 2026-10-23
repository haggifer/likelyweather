import { Series } from '@fa/shared/api'
import { isComputedView } from '@fa/shared/dashboard'
import { formatNumber, formatWindDirection } from '@fa/shared/format'
import { getLegendRows } from '@fa/shared/legend-rows'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { getDataVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Eye, EyeOff } from 'lucide-react-native'
import { memo } from 'react'
import { View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { LineSwatch } from '../ui/LineSwatch'
import { Text } from '../ui/text'
import { Toggle } from '../ui/toggle'

// The eye button is 36 px and takes taps across 44 px, the web's `touch:hit-area`.
const EYE_HIT_SLOP = 4
const EYE_CLASS = 'size-3.5'
const EYE_BUTTON_CLASS = 'size-9'
// A model's row is laid out like the median's (author, 2026-10-14): the same swatch length, gaps and padding.
const ROW_CLASS = 'min-h-10 flex-row items-center gap-1.5 py-1 pr-0.5 pl-2'

// Shared elements, so an unchanged eye is not rebuilt on every tap of the chart; the class picks the theme's colour.
const EYE = <Icon as={Eye} className={EYE_CLASS} />
const EYE_OFF = <Icon as={EyeOff} className={EYE_CLASS} />

// The median as the chart draws it: thicker than a model and round-capped; the web's line runs to 1 px from each end,
// so the box trims its caps.
const MedianSwatch = ({ color }: { color: string }) => (
    <Svg width={18} height={6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Line x1={1} x2={17} y1={3} y2={3} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </Svg>
)

interface RowProps {
    modelId: ModelId
    // Formatted, so a tap that leaves a model's text unchanged does not re-render its row.
    value: string
    isHidden: boolean
    onToggleHidden: (id: ModelId) => void
}

// One model's row; a tap on the chart re-renders only the rows whose value text changed.
const ModelRow = memo(function ModelRow({ modelId, value, isHidden, onToggleHidden }: RowProps) {
    const t = useTranslations('legend')

    const model = MODEL_BY_ID[modelId]

    return (
        <View className={cn(ROW_CLASS, isHidden && 'opacity-45')}>
            <View className="flex-1 flex-row items-center gap-2">
                <LineSwatch color={model.color} dash={model.dash} />
                <Text className={cn('shrink text-sm leading-tight', isHidden && 'line-through')}>{model.name}</Text>
            </View>
            <Text className="text-right text-sm font-medium">{value}</Text>
            <Button
                variant="ghost"
                size="icon-xs"
                className={EYE_BUTTON_CLASS}
                onPress={() => onToggleHidden(modelId)}
                hitSlop={EYE_HIT_SLOP}
                accessibilityLabel={isHidden ? t('show', { model: model.name }) : t('hide', { model: model.name })}
            >
                {isHidden ? EYE_OFF : EYE}
            </Button>
        </View>
    )
})

interface IProps {
    series: Series[]
    median: number | null
    readoutIndex: number
    readoutLabel: string
    variable: Variable
    // The median wind direction at the readout time: a phone can't hover the arrows, so the readout names it.
    direction?: number | null
    // A pair reads "actual (companion)" whichever sub-tab is open (author, 2026-10-14).
    pairedRuns?: PairedRuns | null
    hidden: ModelId[]
    isMedianHidden: boolean
    onToggleHidden: (id: ModelId) => void
    onToggleMedian: () => void
    onReset: () => void
}

// The models at the chart's readout time in one column, highest first, under the median; the eye hides a model, the
// median too.
export function ModelLegend({
    series,
    median,
    readoutIndex,
    readoutLabel,
    variable,
    direction = null,
    pairedRuns = null,
    hidden,
    isMedianHidden,
    onToggleHidden,
    onToggleMedian,
    onReset,
}: IProps) {
    const t = useTranslations('legend')
    const tc = useTranslations('chart')
    const tv = useTranslations('variables')
    const { chart } = useTheme()

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const modelInfo = VARIABLE_BY_ID[getDataVariable(variable)]
    const isComputed = isComputedView(variable)
    const rows = getLegendRows(series, readoutIndex, hidden)
    const isChanged = hidden.length > 0 || isMedianHidden
    const medianText = pairedRuns
        ? formatPairedMedian(pairedRuns, readoutIndex, decimals)
        : formatNumber(median, decimals)

    const formatRow = (modelId: ModelId, value: number | null) =>
        pairedRuns
            ? formatPairedModel(pairedRuns, modelId, readoutIndex, decimals)
            : isComputed
              ? `${formatNumber(value, modelInfo.decimals)} ${modelInfo.unit}`
              : formatNumber(value, decimals)

    return (
        <View className="gap-2">
            <View className="min-h-[1.125rem] flex-row items-center justify-between gap-2">
                <Text className="shrink text-sm font-medium">
                    {readoutLabel}
                    {direction !== null && (
                        <Text className="text-sm font-normal text-muted-foreground">
                            {'  '}
                            {tc('windFrom', { direction: formatWindDirection(direction, tc('compass').split(',')) })}
                        </Text>
                    )}
                </Text>
                {isChanged && (
                    <Button variant="link" size="xs" onPress={onReset} hitSlop={8} className="h-auto px-0">
                        <Text className="text-sm">{t('reset')}</Text>
                    </Button>
                )}
            </View>
            <View
                className={cn(
                    'flex-row items-center gap-1.5 rounded-md bg-muted py-1 pr-0.5 pl-2',
                    isMedianHidden && 'opacity-45',
                )}
            >
                <View className="min-h-10 flex-1 flex-row items-center gap-2">
                    <MedianSwatch color={chart.median} />
                    <Text className={cn('text-sm font-semibold', isMedianHidden && 'line-through')}>
                        {isComputed ? tv(variable) : t('median')}
                    </Text>
                </View>
                {!isMedianHidden && (
                    <Text className="text-sm font-semibold">
                        {medianText} <Text className="text-sm font-normal text-muted-foreground">{unit}</Text>
                    </Text>
                )}
                {/* The web's aria-pressed: a toggle that is on while the median is hidden. */}
                <Toggle
                    pressed={isMedianHidden}
                    onPressedChange={onToggleMedian}
                    hitSlop={EYE_HIT_SLOP}
                    accessibilityLabel={isMedianHidden ? t('showMedian') : t('hideMedian')}
                    className="size-9 min-w-9 bg-transparent px-0"
                >
                    {isMedianHidden ? EYE_OFF : EYE}
                </Toggle>
            </View>
            <View className="gap-y-0.5">
                {rows.map(({ modelId, value, isHidden }) => (
                    <ModelRow
                        key={modelId}
                        modelId={modelId}
                        value={isHidden ? '' : formatRow(modelId, value)}
                        isHidden={isHidden}
                        onToggleHidden={onToggleHidden}
                    />
                ))}
            </View>
        </View>
    )
}
