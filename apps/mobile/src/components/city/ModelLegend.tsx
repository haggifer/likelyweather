import { Series } from '@fa/shared/api'
import { formatNumber, formatWindDirection } from '@fa/shared/format'
import { getLegendRows } from '@fa/shared/legend-rows'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
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

// The eye button is 28 px and takes taps across 36 px, the web's `pointer-coarse:after:-inset-1.5`.
const EYE_HIT_SLOP = 4
// The web's phone legend clips the model swatches to 12 px; their dashes still show.
const MODEL_SWATCH_WIDTH = 12
const COLUMNS = 2
const EYE_CLASS = 'size-3.5 text-muted-foreground'
// One wrapping list rather than a view per line, so a row that moves when the values re-sort keeps its view.
const CELL_CLASS = 'min-h-9 grow basis-2/5 flex-row items-center gap-1.5 px-1.5'

// Shared elements, so an unchanged eye is not rebuilt on every tap of the chart; the class picks the theme's colour.
const EYE = <Icon as={Eye} className={EYE_CLASS} />
const EYE_OFF = <Icon as={EyeOff} className={EYE_CLASS} />

// The median as the chart draws it: thicker than a model and round-capped.
const MedianSwatch = ({ color }: { color: string }) => (
    <Svg width={18} height={6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Line x1={2} x2={16} y1={3} y2={3} stroke={color} strokeWidth={4} strokeLinecap="round" />
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
        <View className={cn(CELL_CLASS, isHidden && 'opacity-45')}>
            <View className="flex-1 flex-row items-center gap-1">
                <LineSwatch color={model.color} dash={model.dash} width={MODEL_SWATCH_WIDTH} />
                <Text className={cn('shrink text-xs leading-[0.9375rem]', isHidden && 'line-through')}>
                    {model.name}
                </Text>
            </View>
            <Text className="min-w-8 text-right text-xs font-medium tabular-nums">{value}</Text>
            <Button
                variant="ghost"
                size="icon-xs"
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
    hidden: ModelId[]
    isMedianHidden: boolean
    onToggleHidden: (id: ModelId) => void
    onToggleMedian: () => void
    onReset: () => void
}

// The models at the chart's readout time in two columns, highest first, under the median; the eye hides a model, the
// median too.
export function ModelLegend({
    series,
    median,
    readoutIndex,
    readoutLabel,
    variable,
    direction = null,
    hidden,
    isMedianHidden,
    onToggleHidden,
    onToggleMedian,
    onReset,
}: IProps) {
    const t = useTranslations('legend')
    const tc = useTranslations('chart')
    const { chart } = useTheme()

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = getLegendRows(series, readoutIndex, hidden)
    const isChanged = hidden.length > 0 || isMedianHidden

    return (
        <View className="gap-2">
            <View className="min-h-[1.125rem] flex-row items-center justify-between gap-2">
                <Text className="shrink text-xs font-medium">
                    {readoutLabel}
                    {direction !== null && (
                        <Text className="text-xs font-normal text-muted-foreground">
                            {'  '}
                            {tc('windFrom', { direction: formatWindDirection(direction, tc('compass').split(',')) })}
                        </Text>
                    )}
                </Text>
                {isChanged && (
                    <Button variant="link" size="xs" onPress={onReset} hitSlop={8} className="h-auto px-0">
                        <Text>{t('reset')}</Text>
                    </Button>
                )}
            </View>
            <View
                className={cn(
                    'flex-row items-center gap-1.5 rounded-md bg-muted pr-0.5 pl-2',
                    isMedianHidden && 'opacity-45',
                )}
            >
                <View className="min-h-9 flex-1 flex-row items-center gap-2">
                    <MedianSwatch color={chart.median} />
                    <Text className={cn('text-[0.8125rem] font-semibold', isMedianHidden && 'line-through')}>
                        {t('median')}
                    </Text>
                </View>
                {!isMedianHidden && (
                    <Text className="text-[0.8125rem] font-semibold tabular-nums">
                        {formatNumber(median, decimals)}{' '}
                        <Text className="text-xs font-normal text-muted-foreground">{unit}</Text>
                    </Text>
                )}
                {/* The web's aria-pressed: a toggle that is on while the median is hidden. */}
                <Toggle
                    pressed={isMedianHidden}
                    onPressedChange={onToggleMedian}
                    hitSlop={EYE_HIT_SLOP}
                    accessibilityLabel={isMedianHidden ? t('showMedian') : t('hideMedian')}
                    className="size-7 min-w-7 bg-transparent px-0"
                >
                    {isMedianHidden ? EYE_OFF : EYE}
                </Toggle>
            </View>
            {/* Rows fill the two columns left to right, highest first, as the web's two-column grid does. */}
            <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
                {rows.map(({ modelId, value, isHidden }) => (
                    <ModelRow
                        key={modelId}
                        modelId={modelId}
                        value={isHidden ? '' : formatNumber(value, decimals)}
                        isHidden={isHidden}
                        onToggleHidden={onToggleHidden}
                    />
                ))}
                {rows.length % COLUMNS > 0 && <View className={CELL_CLASS} />}
            </View>
            <Text className="text-[0.6875rem] leading-[0.9375rem] text-muted-foreground">{t('hintTouch')}</Text>
        </View>
    )
}
