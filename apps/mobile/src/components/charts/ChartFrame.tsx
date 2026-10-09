import { BarChart3, Table2 } from 'lucide-react-native'
import { ReactNode, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useTranslations } from 'use-intl'
import { useTheme } from '../../hooks/useTheme'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Text } from '../ui/Text'

const styles = StyleSheet.create({
    summary: { fontSize: 12, lineHeight: 17 },
})

interface IProps {
    title: string
    description?: string
    summary?: string | null
    // With a table, a toggle in the header swaps the chart and everything under it for the numbers.
    table?: ReactNode
    // The card fades while newer data replaces what it shows.
    isFetching?: boolean
    children: ReactNode
}

// The web's ChartFrame: a card with the chart, an optional table view and the text summary last.
export function ChartFrame({ title, description, summary, table, isFetching = false, children }: IProps) {
    const t = useTranslations('chart')
    const { colors } = useTheme()

    const [isTable, setIsTable] = useState(false)

    const tableToggle = table ? (
        <Button
            variant="ghost"
            icon={isTable ? BarChart3 : Table2}
            label={isTable ? t('chart') : t('table')}
            onPress={() => setIsTable((v) => !v)}
            accessibilityLabel={isTable ? t('showChart') : t('showTable')}
            isSelected={isTable}
        />
    ) : undefined

    return (
        <Card title={title} description={description} action={tableToggle} isDimmed={isFetching}>
            {isTable && table ? table : children}
            {summary && <Text style={[styles.summary, { color: colors['muted-foreground'] }]}>{summary}</Text>}
        </Card>
    )
}
