'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/cn'
import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboard-slice'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { CloudRain, Gauge, LucideIcon, Thermometer, Wind } from 'lucide-react'
import { useTranslations } from 'next-intl'

const ICONS: Record<Variable, LucideIcon> = {
    [Variable.Temp]: Thermometer,
    [Variable.Wind]: Wind,
    [Variable.Pressure]: Gauge,
    [Variable.Precip]: CloudRain,
}

interface IProps {
    className?: string
}

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
                        className="gap-1.5 border-border px-2.5 text-xs pointer-coarse:h-9 max-sm:flex-1 dark:border-input"
                    >
                        <Icon className="size-3.5" />
                        <span className={cn(id !== variable && 'max-sm:sr-only')}>{t(id)}</span>
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
