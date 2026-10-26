import { getPanelSeries } from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { formatOverviewTableCell, getOverviewTableColumns, OverviewTableColumn } from '@fa/chart-core/overview-table'
import { PanelVariable } from '@fa/shared/overview-panels'
import { VARIABLE_BY_ID } from '@fa/shared/variables'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { TimeTable } from './TimeTable'
import { TimeTableRow } from './types'

const COLUMN_CLASS = 'w-[4.5rem]'

const getCells = (
    column: OverviewTableColumn,
    series: OverviewMedians,
    chance: (number | null)[] | null,
    steps: string[],
) => steps.map((step, i) => formatOverviewTableCell(column, series, chance, step, i))

interface IProps {
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    series: OverviewMedians
    chance: (number | null)[] | null
    timeZone: string
    locale: string
}

export function OverviewTable({ panels, series, chance, timeZone, locale }: IProps) {
    const tv = useTranslations('variables')
    const tc = useTranslations('city')

    const steps = getPanelSeries(series, panels[0]).steps
    const getLabel = ({ variable }: OverviewTableColumn) =>
        variable ? `${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}` : `${tc('chanceOfRain')}, %`
    const rows = getOverviewTableColumns(panels, chance !== null).map((column): TimeTableRow => ({
        key: column.key,
        label: getLabel(column),
        cells: getCells(column, series, chance, steps),
    }))

    return (
        <View className="mt-1">
            <TimeTable steps={steps} timeZone={timeZone} locale={locale} rows={rows} columnClassName={COLUMN_CLASS} />
        </View>
    )
}
