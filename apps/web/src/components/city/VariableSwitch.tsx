'use client'

import { TAB_TRANSITION_MS } from '@/components/city/tab-transition'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsPhone } from '@/hooks/useIsPhone'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboard-slice'
import { usePendingValue } from '@fa/hooks/usePendingValue'
import { getVariablePair, getVariableTab, PHONE_VARIABLES, Variable, VARIABLES } from '@fa/shared/variables'
import {
    Cloud,
    CloudRain,
    Droplets,
    Gauge,
    LucideIcon,
    Thermometer,
    ThermometerSun,
    Wind,
    WindArrowDown,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

const ALL_VARIABLES = VARIABLES.map((v) => v.id)

const ICONS: Record<Variable, LucideIcon> = {
    [Variable.Temp]: Thermometer,
    [Variable.Feels]: ThermometerSun,
    [Variable.Wind]: Wind,
    [Variable.Gusts]: WindArrowDown,
    [Variable.Pressure]: Gauge,
    [Variable.Precip]: CloudRain,
    [Variable.Humidity]: Droplets,
    [Variable.Cloud]: Cloud,
}

interface IProps {
    className?: string
}

// On phones only the selected variable is named, as in the app; the others keep their icon and their accessible name.
// Phones name a pair once (Temperature, Wind) and pick its member with the sub-tabs above the chart (`VariablePairTabs`).
export function VariableSwitch({ className }: IProps) {
    const t = useTranslations('variables')
    const tTabs = useTranslations('variableTabs')
    const dispatch = useAppDispatch()
    const isPhone = useIsPhone()
    const { value: variable, setValue: setPicked } = usePendingValue(
        useAppSelector((s) => s.dashboard.variable),
        (next) => dispatch(setVariable(next)),
        TAB_TRANSITION_MS,
    )

    const ids = isPhone ? PHONE_VARIABLES : ALL_VARIABLES
    const selected = isPhone ? getVariableTab(variable) : variable

    const getLabel = (id: Variable) => (isPhone && getVariablePair(id) ? tTabs(id) : t(id))

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={selected}
            onValueChange={(v) => v && setPicked(v as Variable)}
            aria-label={t('label')}
            className={className}
        >
            {ids.map((id) => {
                const Icon = ICONS[id]
                const label = getLabel(id)

                return (
                    <ToggleGroupItem
                        key={id}
                        value={id}
                        aria-label={label}
                        title={label}
                        className={cn(
                            'h-9 min-w-0 shrink gap-1 px-2 text-xs data-[state=on]:bg-accent max-sm:text-sm min-[65.5rem]:text-[0.8125rem]',
                            id === selected ? 'max-sm:flex-[3.4] max-sm:px-2' : 'max-sm:flex-1 max-sm:px-0',
                        )}
                    >
                        <Icon className={cn('size-3.5 shrink-0', id === selected && 'max-sm:hidden')} />
                        <span className={cn('truncate', id !== selected && 'max-sm:sr-only')}>{label}</span>
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
