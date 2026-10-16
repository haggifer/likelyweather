import { getVariablePair, getVariableTab, Variable } from '@fa/shared/variables'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Text } from '../ui/text'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'

interface IProps {
    value: Variable
    onChange: (variable: Variable) => void
}

// The web's phone sub-tabs for a pair, full width above the chart: the actual value and its companion
// (author, 2026-10-14). Nothing renders for a variable without one.
export function VariablePairTabs({ value, onChange }: IProps) {
    const t = useTranslations('subVariables')
    const tTabs = useTranslations('variableTabs')

    const pair = getVariablePair(value)

    if (!pair) return null

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            value={value}
            // A tap on the open sub-tab would clear the group; one of the pair always stays open.
            onValueChange={(next) => next && onChange(next as Variable)}
            accessibilityLabel={t('label', { variable: tTabs(getVariableTab(value)) })}
            className="mb-3 w-full"
        >
            {pair.map((id, i) => (
                <ToggleGroupItem
                    key={id}
                    value={id}
                    isFirst={i === 0}
                    isLast={i === pair.length - 1}
                    className={cn('h-9 flex-1 border-border', id === value && 'bg-accent')}
                >
                    <Text className="text-sm">{t(id)}</Text>
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
