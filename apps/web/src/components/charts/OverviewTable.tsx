'use client'

import { TimeTable } from '@/components/charts/TimeTable'
import { getPanelSeries } from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { formatOverviewTableCell, getOverviewTableColumns, OverviewTableColumn } from '@fa/chart-core/overview-table'
import { PanelVariable } from '@fa/shared/overview-panels'
import { VARIABLE_BY_ID } from '@fa/shared/variables'
import { useTranslations } from 'next-intl'

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
    const columns = getOverviewTableColumns(panels, chance !== null)

    const getLabel = ({ variable }: OverviewTableColumn) =>
        variable ? `${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}` : `${tc('chanceOfRain')}, %`

    const rows = columns.map((column) => ({
        key: column.key,
        label: getLabel(column),
        cells: steps.map((step, i) => formatOverviewTableCell(column, series, chance, step, i)),
    }))

    return (
        <div className="mt-1">
            <TimeTable steps={steps} timeZone={timeZone} locale={locale} rows={rows} columnClassName="w-18" />
        </div>
    )
}
