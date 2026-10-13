'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboard-slice'
import { Variable, VARIABLES } from '@fa/shared/variables'
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

// Eight variables leave room for every label only from `lg`; below it only the selected one is named, the others
// keep their icon and their accessible name. On phones the named segment takes the room its label needs and the
// others share the rest, as in the app.
export function VariableSwitch({ className }: IProps) {
    const t = useTranslations('variables')
    const dispatch = useAppDispatch()
    const variable = useAppSelector((s) => s.dashboard.variable)

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={variable}
            onValueChange={(v) => v && dispatch(setVariable(v as Variable))}
            aria-label={t('label')}
            className={className}
        >
            {VARIABLES.map(({ id }) => {
                const Icon = ICONS[id]

                return (
                    <ToggleGroupItem
                        key={id}
                        value={id}
                        aria-label={t(id)}
                        title={t(id)}
                        className={cn(
                            'min-w-0 gap-1.5 px-2.5 text-xs pointer-coarse:h-9 data-[state=on]:bg-accent',
                            id === variable ? 'max-sm:flex-[3.4] max-sm:px-2' : 'max-sm:flex-1 max-sm:px-0',
                        )}
                    >
                        <Icon className={cn('size-3.5 shrink-0', id === variable && 'max-sm:hidden')} />
                        <span className={cn('truncate', id !== variable && 'max-lg:sr-only')}>{t(id)}</span>
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
