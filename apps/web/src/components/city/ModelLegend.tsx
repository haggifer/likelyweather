'use client'

import { LineSwatch } from '@/components/shell/LineSwatch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHighlightedModel, showAllModels, toggleHiddenModel, toggleMedian } from '@/store/dashboard-slice'
import { Series } from '@fa/shared/api'
import { formatNumber, formatWindDirection } from '@fa/shared/format'
import { getLegendRows } from '@fa/shared/legend-rows'
import { MODEL_BY_ID, ModelId } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

interface RowProps {
    modelId: ModelId
    value: string
    isHidden: boolean
}

// Shared elements, so an unchanged icon is not rebuilt on every hover. Touch screens get a 14 px eye in a 36 px button.
const EYE = <Eye className="size-3 max-sm:size-3.5" />
const EYE_OFF = <EyeOff className="size-3 max-sm:size-3.5" />
const EYE_BUTTON = 'touch:size-9 touch:hit-area'

// One model's row; a hover re-renders only the rows whose value text changed (author's lag report, 2026-10-12).
const ModelRow = memo(function ModelRow({ modelId, value, isHidden }: RowProps) {
    const t = useTranslations('legend')
    const dispatch = useAppDispatch()

    const model = MODEL_BY_ID[modelId]

    return (
        <li
            className={cn(
                'flex h-(--row-height) items-center gap-1.5 rounded-md px-1.5 text-[0.8125rem] max-sm:h-auto max-sm:min-h-10 max-sm:py-1 max-sm:pr-0.5 max-sm:pl-2 max-sm:text-sm sm:gap-2 hover:bg-muted',
                isHidden && 'opacity-45',
            )}
            onMouseEnter={() => dispatch(setHighlightedModel(modelId))}
            onMouseLeave={() => dispatch(setHighlightedModel(null))}
            onFocus={() => dispatch(setHighlightedModel(modelId))}
            onBlur={() => dispatch(setHighlightedModel(null))}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <LineSwatch color={model.color} dash={model.dash} />
                <span
                    className={cn(
                        'truncate max-sm:whitespace-normal max-sm:break-words max-sm:leading-tight',
                        isHidden && 'line-through',
                    )}
                >
                    {model.name}
                </span>
            </div>
            <span className="w-14 text-right font-medium whitespace-nowrap max-sm:w-auto">{value}</span>
            <Button
                variant="ghost"
                size="icon-xs"
                className={EYE_BUTTON}
                onClick={() => dispatch(toggleHiddenModel(modelId))}
                aria-label={isHidden ? t('show', { model: model.name }) : t('hide', { model: model.name })}
            >
                {isHidden ? EYE_OFF : EYE}
            </Button>
        </li>
    )
})

interface IProps {
    series: Series[]
    median: number | null
    readoutIndex: number
    readoutLabel: string
    variable: Variable
    direction?: number | null
    // Phones read a pair together, "actual (companion)" (author, 2026-10-14).
    pairedRuns?: PairedRuns | null
}

// `direction` is the median wind direction at the readout time: on a touch screen the arrows' hover titles can't be
// read, so the readout names it.
export function ModelLegend({
    series,
    median,
    readoutIndex,
    readoutLabel,
    variable,
    direction = null,
    pairedRuns = null,
}: IProps) {
    const t = useTranslations('legend')
    const tc = useTranslations('chart')
    const dispatch = useAppDispatch()
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const isMedianHidden = useAppSelector((s) => s.dashboard.isMedianHidden)

    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = getLegendRows(series, readoutIndex, hidden)
    const medianText = pairedRuns
        ? formatPairedMedian(pairedRuns, readoutIndex, decimals)
        : formatNumber(median, decimals)

    const formatRow = (modelId: ModelId, value: number | null) =>
        pairedRuns ? formatPairedModel(pairedRuns, modelId, readoutIndex, decimals) : formatNumber(value, decimals)

    return (
        <div className="flex flex-col gap-2">
            <div className="flex min-h-4.5 items-center justify-between gap-2 text-xs max-sm:text-sm">
                <span className="font-medium">
                    {readoutLabel}
                    {direction !== null && (
                        <span className="ml-2 font-normal text-muted-foreground">
                            {tc('windFrom', { direction: formatWindDirection(direction, tc('compass').split(',')) })}
                        </span>
                    )}
                </span>
                {(hidden.length > 0 || isMedianHidden) && (
                    <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0 text-xs touch:hit-area max-sm:text-sm"
                        onClick={() => dispatch(showAllModels())}
                    >
                        {t('reset')}
                    </Button>
                )}
            </div>
            <div
                className={cn(
                    'flex items-center gap-1.5 rounded-md bg-muted py-1 pr-0.5 pl-2 text-[0.8125rem] max-sm:min-h-10 max-sm:text-sm sm:gap-2',
                    isMedianHidden && 'opacity-45',
                )}
            >
                <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                    <svg width="18" height="6" aria-hidden="true" className="shrink-0">
                        <line
                            x1="1"
                            x2="17"
                            y1="3"
                            y2="3"
                            stroke="var(--chart-median)"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className={cn(isMedianHidden && 'line-through')}>{t('median')}</span>
                </span>
                <span className="text-right font-semibold">
                    {isMedianHidden ? '' : medianText}{' '}
                    {!isMedianHidden && (
                        <span className="text-xs font-normal text-muted-foreground max-sm:text-sm">{unit}</span>
                    )}
                </span>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className={EYE_BUTTON}
                    onClick={() => dispatch(toggleMedian())}
                    aria-label={isMedianHidden ? t('showMedian') : t('hideMedian')}
                    aria-pressed={isMedianHidden}
                >
                    {isMedianHidden ? EYE_OFF : EYE}
                </Button>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 max-sm:grid-cols-1 lg:grid-cols-1">
                {rows.map(({ modelId, value, isHidden }) => (
                    <ModelRow
                        key={modelId}
                        modelId={modelId}
                        value={isHidden ? '' : formatRow(modelId, value)}
                        isHidden={isHidden}
                    />
                ))}
            </ul>
            <p className="text-xs leading-snug text-muted-foreground pointer-coarse:hidden">{t('hint')}</p>
        </div>
    )
}
