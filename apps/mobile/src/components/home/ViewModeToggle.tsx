import { BarChart3, Table2 } from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { useViewMode } from '../../hooks/useViewMode'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'

// The web's ViewModeToggle on phones: the overview's and the archive's charts or table switch as a 36 px icon.
export function ViewModeToggle() {
    const t = useTranslations('chart')
    const { isTable, toggleTable } = useViewMode()

    return (
        <Button
            variant="outline"
            size="sm"
            onPress={toggleTable}
            accessibilityLabel={isTable ? t('showCharts') : t('showTable')}
            className="size-9 px-0"
        >
            <Icon as={isTable ? BarChart3 : Table2} className="size-4" />
        </Button>
    )
}
