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
import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../legacy-ui/Text'

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

const styles = StyleSheet.create({
    group: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
    item: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 36 },
    // The named segment takes the room its label needs, the web's `flex-[3.4]`; a longer name ends in an ellipsis.
    selected: { flex: 3.4, paddingHorizontal: 8 },
    label: { flexShrink: 1, fontSize: 13, fontWeight: '500' },
})

interface IProps {
    value: Variable
    onChange: (variable: Variable) => void
}

// The web's phone layout: eight segments, only the selected one named and without its icon; the others show their
// icon and keep their accessible name.
export function VariableSwitch({ value, onChange }: IProps) {
    const t = useTranslations('variables')
    const { colors, radius } = useTheme()

    return (
        <View
            style={[
                styles.group,
                { borderColor: colors.border, borderRadius: radius * 0.8, backgroundColor: colors.card },
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('label')}
        >
            {VARIABLES.map(({ id }, i) => {
                const Icon = ICONS[id]
                const isSelected = id === value
                const color = isSelected ? colors['accent-foreground'] : colors['muted-foreground']

                return (
                    <Pressable
                        key={id}
                        onPress={() => onChange(id)}
                        accessibilityRole="radio"
                        accessibilityLabel={t(id)}
                        // A radio's state is `checked`, read as checked or not checked, like the web's radio group.
                        accessibilityState={{ checked: isSelected }}
                        style={[
                            styles.item,
                            i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                            isSelected && [styles.selected, { backgroundColor: colors.accent }],
                        ]}
                    >
                        {isSelected ? (
                            <Text numberOfLines={1} style={[styles.label, { color }]}>
                                {t(id)}
                            </Text>
                        ) : (
                            <Icon size={16} color={color} />
                        )}
                    </Pressable>
                )
            })}
        </View>
    )
}
