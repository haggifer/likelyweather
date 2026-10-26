'use client'

import { TAB_TRANSITION_MS } from '@/components/city/tab-transition'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboard-slice'
import { usePendingValue } from '@fa/hooks/usePendingValue'
import { getVariablePair, getVariableTab, Variable } from '@fa/shared/variables'
import { useTranslations } from 'next-intl'

// The phone dashboard's sub-tabs for a pair: the actual value and its companion.
export function VariablePairTabs() {
    const t = useTranslations('subVariables')
    const tTabs = useTranslations('variableTabs')
    const dispatch = useAppDispatch()
    const { value: variable, setValue: setPicked } = usePendingValue(
        useAppSelector((s) => s.dashboard.variable),
        (next) => dispatch(setVariable(next)),
        TAB_TRANSITION_MS,
    )

    const pair = getVariablePair(variable)

    if (!pair) return null

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={variable}
            // A tap on the open sub-tab would clear the group; one of the pair always stays open.
            onValueChange={(v) => v && setPicked(v as Variable)}
            aria-label={t('label', { variable: tTabs(getVariableTab(variable)) })}
            className="w-full"
        >
            {pair.map((id) => (
                <ToggleGroupItem key={id} value={id} className="h-9 flex-1 text-sm data-[state=on]:bg-accent">
                    {t(id)}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
