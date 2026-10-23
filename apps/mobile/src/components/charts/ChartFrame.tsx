import { BarChart3, Table2 } from 'lucide-react-native'
import { ReactNode } from 'react'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useViewMode } from '../../hooks/useViewMode'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'
import { NoDataOverlay } from './NoDataOverlay'

interface IProps {
    title: string
    // With a table, a toggle in the header swaps the chart and everything under it for the numbers.
    table?: ReactNode
    // Shown above the chart, not with the table, which already holds what they switch between.
    tabs?: ReactNode
    // The card fades while newer data replaces what it shows.
    isFetching?: boolean
    // Shown over the chart and the table when they have no value to draw.
    emptyMessage?: string | null
    className?: string
    children: ReactNode
}

// The web's ChartFrame: a card with the chart and an optional table view.
export function ChartFrame({ title, table, tabs, isFetching = false, emptyMessage, className, children }: IProps) {
    const t = useTranslations('chart')

    const { isTable, toggleTable } = useViewMode()

    return (
        <Card className={cn('gap-2 py-4', className)}>
            <CardHeader className="flex-row items-center gap-1 px-4">
                <CardTitle className="flex-1 text-lg leading-snug font-semibold">{title}</CardTitle>
                {table && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={toggleTable}
                        accessibilityLabel={isTable ? t('showChart') : t('showTable')}
                    >
                        <Icon as={isTable ? BarChart3 : Table2} />
                        <Text className="text-sm">{isTable ? t('chart') : t('table')}</Text>
                    </Button>
                )}
            </CardHeader>
            {tabs && !isTable && <View className="px-4">{tabs}</View>}
            {/* The chart runs close to the card's left edge, while the table keeps the card's padding. */}
            <CardContent className={cn('relative', isTable ? 'px-4' : 'pr-4 pl-1', isFetching && 'opacity-60')}>
                {isTable && table ? table : children}
                {emptyMessage && <NoDataOverlay message={emptyMessage} />}
            </CardContent>
        </Card>
    )
}
