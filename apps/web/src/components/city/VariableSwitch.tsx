'use client'

import { TAB_TRANSITION_MS } from '@/components/city/tab-transition'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useIsPhone } from '@/hooks/useIsPhone'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setSwitchCompact, setVariable } from '@/store/dashboard-slice'
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
    Umbrella,
    Wind,
    WindArrowDown,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createElement, useEffect } from 'react'

const ALL_VARIABLES = VARIABLES.map((v) => v.id)

const ICONS: Record<Variable, LucideIcon> = {
    [Variable.Temp]: Thermometer,
    [Variable.Feels]: ThermometerSun,
    [Variable.Wind]: Wind,
    [Variable.Gusts]: WindArrowDown,
    [Variable.Pressure]: Gauge,
    [Variable.Precip]: CloudRain,
    [Variable.Chance]: Umbrella,
    [Variable.Humidity]: Droplets,
    [Variable.Cloud]: Cloud,
}

interface IProps {
    className?: string
}

// From `sm` up every variable is named while all the names fit. On phones, and wherever the named switch is wider than
// its room (which depends on the language), the phone switch takes over: only the selected one is named, the others keep
// their icon and their accessible name, the named segment takes the room its label needs and the others share the rest,
// as in the app. It names a pair once (Temperature, Wind, Precipitation) and picks its member with the sub-tabs above
// the chart (`VariablePairTabs`, shown while `isSwitchCompact`).
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

    const { ref: roomRef, width: room } = useElementWidth(0)
    const { ref: namedRef, width: namedWidth } = useElementWidth(0)

    const isCompact = isPhone || namedWidth > room
    const ids = isCompact ? PHONE_VARIABLES : ALL_VARIABLES
    const selected = isCompact ? getVariableTab(variable) : variable

    const getLabel = (id: Variable, isPhoneLabel: boolean) => (isPhoneLabel && getVariablePair(id) ? tTabs(id) : t(id))
    const renderItem = (id: Variable, isSelected: boolean) => {
        const Icon = ICONS[id]
        const label = getLabel(id, isCompact)

        return (
            <ToggleGroupItem
                key={id}
                value={id}
                aria-label={label}
                title={label}
                className={cn(
                    'h-9 min-w-0 shrink gap-1 px-2 text-xs data-[state=on]:bg-accent max-sm:text-sm',
                    isSelected ? 'max-sm:flex-[3.4] max-sm:px-2' : 'max-sm:flex-1 max-sm:px-0',
                    isCompact && (isSelected ? 'flex-[3.4] px-2 text-sm' : 'flex-1 px-0 text-sm'),
                )}
            >
                <Icon
                    className={cn(
                        'size-3.5 shrink-0',
                        isSelected && 'max-sm:hidden',
                        isSelected && isCompact && 'hidden',
                    )}
                />
                <span
                    className={cn('truncate', !isSelected && 'max-sm:sr-only', !isSelected && isCompact && 'sr-only')}
                >
                    {label}
                </span>
            </ToggleGroupItem>
        )
    }

    useEffect(() => {
        dispatch(setSwitchCompact(isCompact))
    }, [dispatch, isCompact])

    return (
        <div ref={roomRef} className={cn('relative min-w-0', className)}>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={selected}
                onValueChange={(v) => v && setPicked(v as Variable)}
                aria-label={t('label')}
                className={cn('max-w-full max-sm:w-full', isCompact && 'w-full')}
            >
                {ids.map((id) => renderItem(id, id === selected))}
            </ToggleGroup>
            {/* The named switch, unseen, at its natural width: whether every name fits depends on the language and the
                font, which CSS can't compare with the room. The clipping box keeps it from widening the page. */}
            {!isPhone && (
                <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
                    <div ref={namedRef} className="w-max">
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={0}
                            value={variable}
                            tabIndex={-1}
                        >
                            {ALL_VARIABLES.map((id) => (
                                <ToggleGroupItem key={id} value={id} tabIndex={-1} className="h-9 gap-1 px-2 text-xs">
                                    {createElement(ICONS[id], { className: 'size-3.5 shrink-0' })}
                                    <span>{t(id)}</span>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                </div>
            )}
        </div>
    )
}
