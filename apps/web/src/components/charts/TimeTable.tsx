'use client'

import { TABLE_SCROLL } from '@/components/charts/table-cells'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { getTimeTableDays, getTimeTableSlotLabels } from '@fa/chart-core/time-table'
import { useMemo } from 'react'

interface TimeTableRow {
    key: string
    label: string
    isBold?: boolean
    // One per slot.
    cells: string[]
}

const HEAD_CELL = 'bg-muted font-semibold'
const COLUMN_LINE = 'border-r last:border-r-0'
// Sticky past the pinned name column (`w-32`) and the cell's own padding, so a date rides the visible left edge while
// its day scrolls past, and the day's end pushes it out.
const DAY_LABEL = 'sticky left-34 inline-block'

// The slots scroll under the label column, so its background stays opaque: the hover colour is the row's muted/50 tint
// mixed into the card colour instead of laid over it. A sticky cell's border stays where the table draws it, so the
// pinned cells draw their column line as an inset shadow.
const STICKY_LABEL_CELL =
    'sticky left-0 z-1 w-32 shadow-[inset_-1px_0_var(--color-border)] bg-card leading-tight whitespace-normal max-sm:bg-muted group-hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))]'

const STICKY_CORNER_CELL = 'sticky left-0 z-2 w-32 bg-muted shadow-[inset_-1px_0_var(--color-border)]'

interface IProps {
    steps: string[]
    timeZone: string
    locale: string
    rows: TimeTableRow[]
    // Sets every slot column's width, so the values line up under their times.
    columnClassName: string
}

export function TimeTable({ steps, timeZone, locale, rows, columnClassName }: IProps) {
    const days = useMemo(() => getTimeTableDays(steps, timeZone, locale), [steps, timeZone, locale])
    const slotLabels = getTimeTableSlotLabels(steps, timeZone, locale)

    return (
        <div className={cn(TABLE_SCROLL, 'sm:max-h-[70vh]')}>
            <Table className="w-max text-xs max-sm:text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead rowSpan={2} className={STICKY_CORNER_CELL} />
                        {days.map((day) => (
                            <TableHead
                                key={day.key}
                                scope="col"
                                colSpan={day.count}
                                className={cn(HEAD_CELL, COLUMN_LINE)}
                            >
                                <span className={DAY_LABEL}>{day.label}</span>
                            </TableHead>
                        ))}
                    </TableRow>
                    <TableRow>
                        {slotLabels.map((label, i) => (
                            <TableHead
                                key={steps[i]}
                                scope="col"
                                className={cn(HEAD_CELL, COLUMN_LINE, columnClassName, 'text-right')}
                            >
                                {label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                {/* The kit drops the last row's line; this table keeps it as its bottom edge. */}
                <TableBody className="[&_tr:last-child]:border-b">
                    {rows.map((row) => (
                        <TableRow key={row.key} className="group">
                            <TableHead scope="row" className={cn(STICKY_LABEL_CELL, row.isBold && 'font-semibold')}>
                                {row.label}
                            </TableHead>
                            {row.cells.map((cell, i) => (
                                <TableCell
                                    key={steps[i]}
                                    className={cn(COLUMN_LINE, 'text-right', row.isBold && 'font-semibold')}
                                >
                                    {cell}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
