import { usePendingValue } from '@fa/hooks/usePendingValue'
import { getVariablePair, getVariableTab, PHONE_VARIABLES, Variable } from '@fa/shared/variables'
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
    [Variable.Chance]: Umbrella,
    [Variable.Humidity]: Droplets,
    [Variable.Cloud]: Cloud,
}

const LAST_INDEX = PHONE_VARIABLES.length - 1

interface IProps {
    value: Variable
    onChange: (variable: Variable) => void
}

// The web's phone layout: six segments, only the selected one named and without its icon; the others show their
// icon and keep their accessible name. The named segment takes the room its label needs, the web's `flex-[3.4]`; a
// longer name ends in an ellipsis. A pair is named once (Temperature, Wind); its sub-tabs above the chart pick the
// member (`VariablePairTabs`).
export function VariableSwitch({ value: current, onChange }: IProps) {
    const t = useTranslations('variables')
    const tTabs = useTranslations('variableTabs')
    // The tab turns on in its own frame; the screen redraws for it after, so the switch never waits for the chart.
    const { value, setValue } = usePendingValue(current, onChange)

    const selected = getVariableTab(value)

    const getLabel = (id: Variable) => (getVariablePair(id) ? tTabs(id) : t(id))

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={selected}
            // A tap on the selected segment would clear the group; the switch always keeps one variable.
            onValueChange={(next) => next && setValue(next as Variable)}
            accessibilityLabel={t('label')}
            className="w-full"
        >
            {PHONE_VARIABLES.map((id, i) => {
                const isSelected = id === selected
                const label = getLabel(id)

                return (
                    <ToggleGroupItem
                        key={id}
                        value={id}
                        isFirst={i === 0}
                        isLast={i === LAST_INDEX}
                        accessibilityLabel={label}
                        className={cn(
                            'h-9 min-w-0 border-border',
                            isSelected ? 'flex-[3.4] bg-accent px-2' : 'flex-1 px-0',
                        )}
                    >
                        {isSelected ? (
                            <Text numberOfLines={1} className="shrink text-sm">
                                {label}
                            </Text>
                        ) : (
                            <ToggleGroupIcon as={ICONS[id]} />
                        )}
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>
    )
}
