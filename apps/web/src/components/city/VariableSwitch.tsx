'use client'

import { useAppDispatch, useAppSelector } from '@/store'
import { setVariable } from '@/store/dashboardSlice'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { ToggleGroup, ToggleGroupItem } from '@fa/ui/components/toggle-group'
import { cn } from '@fa/ui/lib/utils'
import { CloudRain, Gauge, LucideIcon, Thermometer, Wind } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    className?: string
}

const ICONS: Record<Variable, LucideIcon> = {
    [Variable.Temp]: Thermometer,
    [Variable.Wind]: Wind,
    [Variable.Pressure]: Gauge,
    [Variable.Precip]: CloudRain,
}

export default function VariableSwitch({ className }: IProps) {
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
                        className="gap-1.5 px-2.5 text-xs pointer-coarse:h-9"
                    >
                        <Icon className="size-3.5" />
                        <span className={cn(id !== variable && 'max-sm:sr-only')}>{t(id)}</span>
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
