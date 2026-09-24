'use client'

import Sparkline from '@/charts/Sparkline'
import { LineSwatch } from '@/components/city/ModelLegend'
import StatusChip from '@/components/shell/StatusChip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber, formatPercent, formatSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SkillCell } from '@/shared/api'
import { MODEL_BY_ID } from '@/shared/models'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo, useState } from 'react'

interface IProps {
    cells: SkillCell[]
    minN: number
    decimals: number
    unit: string
    showHitRate: boolean
}

interface RankedRow extends SkillCell {
    rank: number | null
}

const nullsLast = (a: number | null | undefined, b: number | null | undefined) => (a ?? Infinity) - (b ?? Infinity)

export default function RankingTable({ cells, minN, decimals, unit, showHitRate }: IProps) {
    const t = useTranslations('scoreboard')
    const [sorting, setSorting] = useState<SortingState>([{ id: 'mae', desc: false }])
    const data = useMemo<RankedRow[]>(() => {
        const ranked = cells.filter((c) => c.n >= minN && c.mae !== null).sort((a, b) => nullsLast(a.mae, b.mae))

        return cells.map((c) => {
            const position = ranked.indexOf(c)
            return { ...c, rank: position >= 0 ? position + 1 : null }
        })
    }, [cells, minN])

    const columns = useMemo<ColumnDef<RankedRow>[]>(
        () => [
            {
                id: 'rank',
                header: '#',
                accessorFn: (row) => row.rank,
                sortingFn: (a, b) => nullsLast(a.original.rank, b.original.rank),
                cell: ({ row }) => row.original.rank ?? '–',
            },
            {
                id: 'model',
                header: t('model'),
                accessorFn: (row) => MODEL_BY_ID[row.modelId].name,
                cell: ({ row }) => {
                    const model = MODEL_BY_ID[row.original.modelId]

                    return (
                        <Link href={`/models/${model.id}`} className="flex items-center gap-2 hover:underline">
                            <LineSwatch color={model.color} dash={model.dash} />
                            <span className="font-medium">{model.name}</span>
                            <span className="text-[11px] text-muted-foreground">{model.provider}</span>
                        </Link>
                    )
                },
            },
            {
                id: 'mae',
                header: `${t('mae')} (${unit})`,
                accessorFn: (row) => row.mae,
                sortingFn: (a, b) =>
                    nullsLast(
                        a.original.rank === null ? Infinity : a.original.mae,
                        b.original.rank === null ? Infinity : b.original.mae,
                    ),
                cell: ({ row }) => (
                    <span className="font-semibold">{formatNumber(row.original.mae, decimals + 1)}</span>
                ),
            },
            {
                id: 'bias',
                header: t('bias'),
                accessorFn: (row) => row.bias,
                sortingFn: (a, b) =>
                    nullsLast(Math.abs(a.original.bias ?? Infinity), Math.abs(b.original.bias ?? Infinity)),
                cell: ({ row }) => formatSigned(row.original.bias, decimals + 1),
            },
            {
                id: 'rmse',
                header: t('rmse'),
                accessorFn: (row) => row.rmse,
                sortingFn: (a, b) => nullsLast(a.original.rmse, b.original.rmse),
                cell: ({ row }) => formatNumber(row.original.rmse, decimals + 1),
            },
            ...(showHitRate
                ? [
                      {
                          id: 'hitRate',
                          header: t('hitRate'),
                          accessorFn: (row: RankedRow) => row.hitRate ?? null,
                          cell: ({ row }: { row: { original: RankedRow } }) => formatPercent(row.original.hitRate),
                      } satisfies ColumnDef<RankedRow>,
                  ]
                : []),
            {
                id: 'n',
                header: 'n',
                accessorFn: (row) => row.n,
                cell: ({ row }) =>
                    row.original.n < minN ? (
                        <StatusChip tone="warn" title={t('sparse', { n: row.original.n })}>
                            {row.original.n}
                        </StatusChip>
                    ) : (
                        row.original.n
                    ),
            },
            {
                id: 'spark',
                header: t('daily'),
                enableSorting: false,
                cell: ({ row }) => (
                    <Sparkline
                        values={row.original.spark}
                        color={MODEL_BY_ID[row.original.modelId].color}
                        label={t('sparkLabel', { model: MODEL_BY_ID[row.original.modelId].name })}
                    />
                ),
            },
        ],
        [t, unit, decimals, minN, showHitRate],
    )

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <Table>
            <TableHeader>
                {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                        {group.headers.map((header) => {
                            const sorted = header.column.getIsSorted()

                            return (
                                <TableHead
                                    key={header.id}
                                    className={cn(header.id !== 'model' && header.id !== 'spark' && 'text-right')}
                                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                                >
                                    {header.column.getCanSort() ? (
                                        <button
                                            type="button"
                                            onClick={header.column.getToggleSortingHandler()}
                                            className="inline-flex items-center gap-1 hover:text-foreground"
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {sorted === 'asc' && <ArrowUp className="size-3" />}
                                            {sorted === 'desc' && <ArrowDown className="size-3" />}
                                        </button>
                                    ) : (
                                        flexRender(header.column.columnDef.header, header.getContext())
                                    )}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map((row) => (
                    <TableRow
                        key={row.id}
                        className={cn('h-(--row-height)', row.original.rank === null && 'text-muted-foreground')}
                    >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell
                                key={cell.id}
                                className={cn(
                                    'py-1',
                                    cell.column.id !== 'model' && cell.column.id !== 'spark' && 'text-right',
                                )}
                            >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
