import { getPanelSeries } from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { formatOverviewTableCell, getOverviewTableColumns, OverviewTableColumn } from '@fa/chart-core/overview-table'
import { formatTableStepLabel } from '@fa/shared/format'
import { PanelVariable } from '@fa/shared/overview-panels'
import { VARIABLE_BY_ID } from '@fa/shared/variables'
import { useTranslations } from 'use-intl'
import { FixedColumnTable, TableColumn } from './FixedColumnTable'

// A column's head takes two lines, "Precipitation," over "mm".
const CELL_CLASS = 'w-24'

interface IProps {
    // The visible panels, in the reader's order.
    panels: PanelVariable[]
    series: OverviewMedians
    chance: (number | null)[] | null
    timeZone: string
    locale: string
}

// The web's OverviewTable: every panel's median and its second line, slot by slot.
export function OverviewTable({ panels, series, chance, timeZone, locale }: IProps) {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const tc = useTranslations('city')

    const steps = getPanelSeries(series, panels[0]).steps
    const overviewColumns = getOverviewTableColumns(panels, chance !== null)
    const rowLabels = steps.map((step) => formatTableStepLabel(step, timeZone, locale))

    const getLabel = ({ variable }: OverviewTableColumn) =>
        variable ? `${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}` : `${tc('chanceOfRain')}, %`
    const columns = overviewColumns.map((column) => ({ key: column.key, label: getLabel(column) }))
    const getCell = (i: number, { key }: TableColumn) =>
        formatOverviewTableCell(
            overviewColumns.find((c) => c.key === key)!,
            series,
            chance,
            steps[i],
            i,
        )

    return (
        <FixedColumnTable
            timeLabel={t('time')}
            rowLabels={rowLabels}
            columns={columns}
            getCell={getCell}
            cellClassName={CELL_CLASS}
        />
    )
}
