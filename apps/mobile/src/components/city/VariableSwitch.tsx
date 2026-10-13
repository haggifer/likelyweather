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
} from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'
import { ToggleGroup, ToggleGroupIcon, ToggleGroupItem } from '../ui/toggle-group'

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

const LAST_INDEX = VARIABLES.length - 1

interface IProps {
    value: Variable
    onChange: (variable: Variable) => void
}

// The web's phone layout: eight segments, only the selected one named and without its icon; the others show their
// icon and keep their accessible name. The named segment takes the room its label needs, the web's `flex-[3.4]`; a
// longer name ends in an ellipsis.
export function VariableSwitch({ value, onChange }: IProps) {
    const t = useTranslations('variables')

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            value={value}
            // A tap on the selected segment would clear the group; the switch always keeps one variable.
            onValueChange={(next) => next && onChange(next as Variable)}
            accessibilityLabel={t('label')}
            className="w-full bg-card"
        >
            {VARIABLES.map(({ id }, i) => {
                const isSelected = id === value

                return (
                    <ToggleGroupItem
                        key={id}
                        value={id}
                        isFirst={i === 0}
                        isLast={i === LAST_INDEX}
                        accessibilityLabel={t(id)}
                        className={cn('h-9 min-w-0 border-border', isSelected ? 'flex-[3.4] px-2' : 'flex-1 px-0')}
                    >
                        {isSelected ? (
                            <Text numberOfLines={1} className="shrink text-[0.8125rem]">
                                {t(id)}
                            </Text>
                        ) : (
                            <ToggleGroupIcon as={ICONS[id]} className="text-muted-foreground" />
                        )}
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
