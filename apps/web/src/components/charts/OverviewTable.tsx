'use client'

import { STICKY_CORNER_CELL, STICKY_HEAD_CELL, STICKY_TIME_CELL, TABLE_SCROLL } from '@/components/charts/table-cells'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { getPanelSeries } from '@fa/chart-core/overview-readouts'
import { OverviewMedians } from '@fa/chart-core/overview-stats'
import { formatOverviewTableCell, getOverviewTableColumns, OverviewTableColumn } from '@fa/chart-core/overview-table'
import { formatTableStepLabel } from '@fa/shared/format'
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

// The overview's numbers, slot by slot: every panel's median and its second line, like the dashboard's table.
export function OverviewTable({ panels, series, chance, timeZone, locale }: IProps) {
    const t = useTranslations('dashboard')
    const tv = useTranslations('variables')
    const tc = useTranslations('city')

    const steps = getPanelSeries(series, panels[0]).steps
    const columns = getOverviewTableColumns(panels, chance !== null)

    const getLabel = ({ variable }: OverviewTableColumn) =>
        variable ? `${tv(variable)}, ${VARIABLE_BY_ID[variable].unit}` : `${tc('chanceOfRain')}, %`

    return (
        // From `sm` up the table takes the window's free height, between 27rem and 70vh (author, 2026-10-16), passed down
        // by its ancestors (`FILL_HEIGHT_PARENT`); phones keep the dashboard's cap.
        <div
            data-fill-height
            className={cn(TABLE_SCROLL, 'mt-1 max-h-[26.25rem] sm:max-h-[70vh] sm:min-h-[27rem] sm:flex-1 sm:basis-0')}
        >
            <Table className="text-xs max-sm:text-sm">
                <TableHeader>
                    <TableRow className="group">
                        <TableHead className={STICKY_CORNER_CELL}>{t('time')}</TableHead>
                        {columns.map((column) => (
                            <TableHead key={column.key} className={cn(STICKY_HEAD_CELL, 'text-right')}>
                                {getLabel(column)}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {steps.map((step, i) => (
                        <TableRow key={step} className="group">
                            <TableCell className={`${STICKY_TIME_CELL} whitespace-nowrap`}>
                                {formatTableStepLabel(step, timeZone, locale)}
                            </TableCell>
                            {columns.map((column) => (
                                <TableCell key={column.key} className="text-right">
                                    {formatOverviewTableCell(column, series, chance, step, i)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
