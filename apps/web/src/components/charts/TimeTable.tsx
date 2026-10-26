'use client'

import { TABLE_SCROLL } from '@/components/charts/table-cells'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DayCellLayout, useDayCellLayout } from '@/hooks/useDayCellLayout'
import { useScrollLeft } from '@/hooks/useScrollLeft'
import { cn } from '@/lib/cn'
import { getLabelWidth } from '@fa/chart-core/day-labels'
import {
    DayLabelForm,
    getTimeTableDays,
    getTimeTableSlotLabels,
    placeDayLabel,
    TimeTableDay,
} from '@fa/chart-core/time-table'
import { RefObject, useMemo, useRef } from 'react'

interface TimeTableRow {
    key: string
    label: string
    isBold?: boolean
    // One per slot.
    cells: string[]
}

interface DayLabelPosition {
    form: DayLabelForm
    // From the cell's left edge.
    left: number
}

// The table's text is 13 px from `sm` and 14 px on phones; the larger size makes a label give way to its digits a few
// pixels early on wide screens rather than overflow its room on phones.
const DAY_LABEL_FONT_SIZE = 14

const HEAD_CELL = 'bg-muted font-semibold'

// The slots scroll under the label column, so its background stays opaque: the hover colour is the row's muted/50 tint
// mixed into the card colour instead of laid over it.
const STICKY_LABEL_CELL =
    'sticky left-0 z-1 w-32 bg-card leading-tight whitespace-normal max-sm:bg-muted group-hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))]'

const STICKY_CORNER_CELL = 'sticky left-0 z-2 w-32 bg-muted'

const getDayLabelPositions = (days: TimeTableDay[], layout: DayCellLayout | null, scrollLeft: number) => {
    if (layout?.spans.length !== days.length) return null

    const visible: [number, number] = [scrollLeft + layout.pinnedEnd, scrollLeft + layout.viewportWidth]

    return days.map((day, i): DayLabelPosition => {
        const span = layout.spans[i]
        const fullWidth = getLabelWidth(day.label, DAY_LABEL_FONT_SIZE)
        const shortWidth = getLabelWidth(day.shortLabel, DAY_LABEL_FONT_SIZE)
        const { form, center } = placeDayLabel(span, visible, fullWidth, shortWidth)

        return { form, left: center - span[0] }
    })
}

interface DayHeaderRowProps {
    days: TimeTableDay[]
    scrollerRef: RefObject<HTMLDivElement | null>
}

// CSS cannot centre a label on the part of its cell the scrolled viewport shows, so the row measures its cells and
// places the dates itself; only this row re-renders as the table scrolls.
const DayHeaderRow = ({ days, scrollerRef }: DayHeaderRowProps) => {
    const rowRef = useRef<HTMLTableRowElement>(null)

    const scrollLeft = useScrollLeft(scrollerRef)
    const layout = useDayCellLayout(scrollerRef, rowRef, days)

    const positions = getDayLabelPositions(days, layout, scrollLeft)

    return (
        <TableRow ref={rowRef}>
            <TableHead rowSpan={2} className={STICKY_CORNER_CELL} />
            {days.map((day, i) => {
                const position = positions?.[i]

                return (
                    <TableHead
                        key={day.key}
                        data-day
                        scope="col"
                        colSpan={day.count}
                        className={cn(HEAD_CELL, 'relative')}
                    >
                        <span className="sr-only">{day.label}</span>
                        {position && position.form !== 'none' && (
                            <span
                                aria-hidden="true"
                                className="absolute top-1/2 -translate-1/2"
                                style={{ left: position.left }}
                            >
                                {position.form === 'full' ? day.label : day.shortLabel}
                            </span>
                        )}
                    </TableHead>
                )
            })}
        </TableRow>
    )
}

interface IProps {
    steps: string[]
    timeZone: string
    locale: string
    rows: TimeTableRow[]
    // Sets every slot column's width, so the values line up under their times.
    columnClassName: string
}

export function TimeTable({ steps, timeZone, locale, rows, columnClassName }: IProps) {
    const scrollerRef = useRef<HTMLDivElement>(null)

    const days = useMemo(() => getTimeTableDays(steps, timeZone, locale), [steps, timeZone, locale])
    const slotLabels = getTimeTableSlotLabels(steps, timeZone, locale)

    return (
        <div ref={scrollerRef} className={TABLE_SCROLL}>
            <Table className="w-max text-xs max-sm:text-sm">
                <TableHeader>
                    <DayHeaderRow days={days} scrollerRef={scrollerRef} />
                    <TableRow>
                        {slotLabels.map((label, i) => (
                            <TableHead
                                key={steps[i]}
                                scope="col"
                                className={cn(HEAD_CELL, columnClassName, 'text-right')}
                            >
                                {label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.key} className="group">
                            <TableHead scope="row" className={cn(STICKY_LABEL_CELL, row.isBold && 'font-semibold')}>
                                {row.label}
                            </TableHead>
                            {row.cells.map((cell, i) => (
                                <TableCell key={steps[i]} className={cn('text-right', row.isBold && 'font-semibold')}>
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
