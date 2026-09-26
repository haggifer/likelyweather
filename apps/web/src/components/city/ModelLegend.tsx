'use client'

import { Button } from '@fa/ui/components/button'
import { formatNumber } from '@fa/shared/format'
import { cn } from '@fa/ui/lib/utils'
import { Series } from '@fa/shared/api'
import { MODEL_BY_ID } from '@fa/shared/models'
import { Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { useAppDispatch, useAppSelector } from '@/store'
import { setHighlightedModel, showAllModels, toggleHiddenModel, togglePinnedModel } from '@/store/dashboardSlice'
import { Eye, EyeOff, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    series: Series[]
    median: number | null
    readoutIndex: number
    readoutLabel: string
    variable: Variable
}

interface SwatchProps {
    color: string
    dash?: string
    width?: number
}

export const LineSwatch = ({ color, dash, width = 18 }: SwatchProps) => (
    <svg width={width} height="6" aria-hidden="true" className="shrink-0">
        <line
            x1="1"
            x2={width - 1}
            y1="3"
            y2="3"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={dash}
            strokeLinecap="round"
        />
    </svg>
)

export default function ModelLegend({ series, median, readoutIndex, readoutLabel, variable }: IProps) {
    const t = useTranslations('legend')
    const dispatch = useAppDispatch()
    const hidden = useAppSelector((s) => s.dashboard.hiddenModels)
    const pinned = useAppSelector((s) => s.dashboard.pinnedModels)
    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const rows = series
        .map((s) => ({
            modelId: s.modelId,
            value: s.values[readoutIndex] ?? null,
            isHidden: hidden.includes(s.modelId),
        }))
        .sort((a, b) => Number(a.isHidden) - Number(b.isHidden) || (b.value ?? -Infinity) - (a.value ?? -Infinity))

    return (
        <div className="flex flex-col gap-2">
            <div className="flex min-h-4.5 items-center justify-between gap-2 text-xs">
                <span className="font-medium">{readoutLabel}</span>
                {(hidden.length > 0 || pinned.length > 0) && (
                    <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0 text-xs"
                        onClick={() => dispatch(showAllModels())}
                    >
                        {t('reset')}
                    </Button>
                )}
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-[13px]">
                <span className="flex items-center gap-2 font-semibold">
                    <svg width="18" height="6" aria-hidden="true">
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
                    {t('median')}
                </span>
                <span className="font-semibold">
                    {formatNumber(median, decimals)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </span>
            </div>
            <ul className="grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-1">
                {rows.map(({ modelId, value, isHidden }) => {
                    const model = MODEL_BY_ID[modelId]
                    const isPinned = pinned.includes(modelId)

                    return (
                        <li
                            key={modelId}
                            className={cn(
                                'group flex h-(--row-height) items-center gap-2 rounded-md px-1.5 text-[13px] hover:bg-muted',
                                isPinned && 'bg-accent',
                                isHidden && 'opacity-45',
                            )}
                            onMouseEnter={() => dispatch(setHighlightedModel(modelId))}
                            onMouseLeave={() => dispatch(setHighlightedModel(null))}
                        >
                            <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                onClick={() => dispatch(togglePinnedModel(modelId))}
                                onFocus={() => dispatch(setHighlightedModel(modelId))}
                                onBlur={() => dispatch(setHighlightedModel(null))}
                                aria-pressed={isPinned}
                                title={isPinned ? t('unpin') : t('pin')}
                            >
                                <LineSwatch color={model.color} dash={model.dash} />
                                <span className={cn('truncate', isHidden && 'line-through')}>{model.name}</span>
                                {isPinned && <Pin className="size-3 shrink-0 text-muted-foreground" />}
                                <kbd className="ml-auto hidden rounded border px-1 font-mono text-[10px] text-muted-foreground group-hover:inline">
                                    {model.hotkey}
                                </kbd>
                            </button>
                            <span className="w-14 text-right font-medium">
                                {isHidden ? '' : formatNumber(value, decimals)}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => dispatch(toggleHiddenModel(modelId))}
                                aria-label={
                                    isHidden ? t('show', { model: model.name }) : t('hide', { model: model.name })
                                }
                            >
                                {isHidden ? <EyeOff /> : <Eye />}
                            </Button>
                        </li>
                    )
                })}
            </ul>
            <p className="text-[11px] leading-snug text-muted-foreground">{t('hint')}</p>
        </div>
    )
}
