import { Variable, VARIABLES } from '@fa/shared/variables'
import { CloudRain, Gauge, LucideIcon, Thermometer, Wind } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'

const ICONS: Record<Variable, LucideIcon> = {
    [Variable.Temp]: Thermometer,
    [Variable.Wind]: Wind,
    [Variable.Pressure]: Gauge,
    [Variable.Precip]: CloudRain,
}

// The selected segment carries its name, so it takes the room the three icon-only segments leave.
const SELECTED_FLEX = 2.6

const styles = StyleSheet.create({
    group: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
    item: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
    label: { fontSize: 13, fontWeight: '500' },
})

interface IProps {
    value: Variable
    onChange: (variable: Variable) => void
}

// The web's phone layout: four equal segments, only the selected one named.
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
                        accessibilityState={{ selected: isSelected }}
                        style={[
                            styles.item,
                            i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                            isSelected && { backgroundColor: colors.accent, flex: SELECTED_FLEX },
                        ]}
                    >
                        <Icon size={16} color={color} />
                        {isSelected && <Text style={[styles.label, { color }]}>{t(id)}</Text>}
                    </Pressable>
                )
            })}
        </View>
    )
}
