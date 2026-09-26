'use client'

import { formatRunDuration, getRunOriginLabel, RunArchiveLink, STATUS_TONES } from '@/components/runs/runParts'
import StatusChip from '@/components/shell/StatusChip'
import { Run } from '@fa/shared/api'
import { formatUtc } from '@fa/shared/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@fa/ui/components/table'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useRef } from 'react'

interface IProps {
    runs: Run[]
    cityNames: Map<number, string>
}

const ROW_HEIGHT = 38
const VIEWPORT_HEIGHT = 480

export default function RunsTable({ runs, cityNames }: IProps) {
    const t = useTranslations('runs')
    const locale = useLocale()
    const viewportRef = useRef<HTMLDivElement>(null)

    const columns = useMemo<ColumnDef<Run>[]>(
        () => [
            {
                id: 'issueTime',
                header: t('issueTime'),
                cell: ({ row }) => (
                    <span className="whitespace-nowrap">{formatUtc(row.original.issueTime, locale)} UTC</span>
                ),
            },
            {
                id: 'origin',
                header: t('origin'),
                cell: ({ row }) => getRunOriginLabel(row.original, t, cityNames),
            },
            {
                id: 'status',
                header: t('status'),
                cell: ({ row }) => (
                    <StatusChip tone={STATUS_TONES[row.original.status]}>
                        {t(`statuses.${row.original.status}`)}
                    </StatusChip>
                ),
            },
            { id: 'rows', header: t('rows'), cell: ({ row }) => row.original.rows.toLocaleString(locale) },
            { id: 'cities', header: t('cities'), cell: ({ row }) => row.original.citiesCount },
            {
                id: 'warnings',
                header: t('warnings'),
                cell: ({ row }) =>
                    row.original.warnings.length ? (
                        <span
                            title={row.original.warnings.join('\n')}
                            className="cursor-help underline decoration-dotted"
                        >
                            {row.original.warnings.length}
                        </span>
                    ) : (
                        '0'
                    ),
            },
            {
                id: 'duration',
                header: t('duration'),
                cell: ({ row }) => formatRunDuration(row.original),
            },
            {
                id: 'archive',
                header: t('archive'),
                cell: ({ row }) => <RunArchiveLink run={row.original} />,
            },
        ],
        [t, locale, cityNames],
    )

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({ data: runs, columns, getCoreRowModel: getCoreRowModel() })
    const rows = table.getRowModel().rows
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => viewportRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 12,
    })
    const items = virtualizer.getVirtualItems()
    const paddingTop = items[0]?.start ?? 0
    const paddingBottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0)

    return (
        <div ref={viewportRef} className="overflow-auto rounded-md border" style={{ maxHeight: VIEWPORT_HEIGHT }}>
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                    {table.getHeaderGroups().map((group) => (
                        <TableRow key={group.id}>
                            {group.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {paddingTop > 0 && (
                        <tr aria-hidden="true">
                            <td style={{ height: paddingTop }} colSpan={columns.length} />
                        </tr>
                    )}
                    {items.map((item) => {
                        const row = rows[item.index]

                        return (
                            <TableRow key={row.id} style={{ height: ROW_HEIGHT }}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="py-1 text-[13px]">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )
                    })}
                    {paddingBottom > 0 && (
                        <tr aria-hidden="true">
                            <td style={{ height: paddingBottom }} colSpan={columns.length} />
                        </tr>
                    )}
                </TableBody>
            </Table>
            {!runs.length && <p className="p-6 text-center text-sm text-muted-foreground">{t('empty')}</p>}
        </div>
    )
}
