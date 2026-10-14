import { BarChart3, Table2 } from 'lucide-react-native'
import { ReactNode, useState } from 'react'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

interface IProps {
    title: string
    description?: string
    // With a table, a toggle in the header swaps the chart and everything under it for the numbers.
    table?: ReactNode
    // The card fades while newer data replaces what it shows.
    isFetching?: boolean
    className?: string
    children: ReactNode
}

// The web's ChartFrame: a card with the chart and an optional table view.
export function ChartFrame({ title, description, table, isFetching = false, className, children }: IProps) {
    const t = useTranslations('chart')

    const [isTable, setIsTable] = useState(false)

    return (
        <Card className={cn('gap-3 py-4', className)}>
            <CardHeader className="flex-row items-start gap-2 px-4">
                <View className="flex-1 gap-1">
                    <CardTitle className="text-base leading-snug">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </View>
                {table && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsTable((v) => !v)}
                        accessibilityLabel={isTable ? t('showChart') : t('showTable')}
                        accessibilityState={{ selected: isTable }}
                    >
                        <Icon as={isTable ? BarChart3 : Table2} className="size-4" />
                        <Text>{isTable ? t('chart') : t('table')}</Text>
                    </Button>
                )}
            </CardHeader>
            <CardContent className={cn('px-4', isFetching && 'opacity-60')}>
                {isTable && table ? table : children}
            </CardContent>
        </Card>
    )
}
