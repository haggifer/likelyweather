'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverPanel, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/cn'
import {
    DEFAULT_OVERVIEW_PANELS,
    getVisiblePanels,
    movePanel,
    OverviewPanels,
    PanelVariable,
    togglePanel,
} from '@fa/shared/overview-panels'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    panels: OverviewPanels
    onChange: (update: (panels: OverviewPanels) => OverviewPanels) => void
    className?: string
}

// Which overview panels show and in which order (author, 2026-10-12): a checkbox and arrows per panel rather than
// drag and drop, so it works the same with a keyboard, a screen reader and a finger. The last shown panel stays.
export function OverviewPanelsMenu({ panels, onChange: setPanels, className }: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')

    const visibleCount = getVisiblePanels(panels).length

    const handleMove = (variable: PanelVariable, step: -1 | 1) => setPanels((p) => movePanel(p, variable, step))

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('customize')}
                    title={t('customize')}
                    className={className}
                >
                    <SlidersHorizontal />
                </Button>
            </PopoverTrigger>
            <PopoverPanel aria-label={t('customizeTitle')}>
                <p className="mb-2 font-semibold">{t('customizeTitle')}</p>
                <ul className="flex flex-col gap-1">
                    {panels.order.map((variable, i) => {
                        const isShown = !panels.hidden.includes(variable)
                        const name = tv(variable)

                        return (
                            <li key={variable} className="flex items-center gap-1">
                                <label className="flex min-h-8 flex-1 cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isShown}
                                        disabled={isShown && visibleCount === 1}
                                        onChange={() => setPanels((p) => togglePanel(p, variable))}
                                        className="size-4 accent-primary"
                                    />
                                    <span className={cn(!isShown && 'text-muted-foreground')}>{name}</span>
                                </label>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t('moveUp', { name })}
                                    disabled={i === 0}
                                    onClick={() => handleMove(variable, -1)}
                                >
                                    <ChevronUp />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t('moveDown', { name })}
                                    disabled={i === panels.order.length - 1}
                                    onClick={() => handleMove(variable, 1)}
                                >
                                    <ChevronDown />
                                </Button>
                            </li>
                        )
                    })}
                </ul>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setPanels(() => DEFAULT_OVERVIEW_PANELS)}
                >
                    {t('resetPanels')}
                </Button>
            </PopoverPanel>
        </Popover>
    )
}
