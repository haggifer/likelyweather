import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber, formatTableStepLabel } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { useTranslations } from 'use-intl'
import { FixedColumnTable, TableColumn } from '../charts/FixedColumnTable'

// The model columns are 72 px wide, or 104 for a pair's "actual (companion)".
const CELL_CLASS = 'w-[4.5rem]'
const PAIRED_CELL_CLASS = 'w-[6.5rem]'
const MEDIAN_KEY = 'median'

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
    // A pair reads "actual (companion)" whichever sub-tab is open.
    pairedRuns: PairedRuns | null
    // The median's eye in the legend hides its column too.
    isMedianHidden: boolean
}

export function SeriesTable({ steps, series, stats, decimals, timeZone, locale, pairedRuns, isMedianHidden }: IProps) {
    const t = useTranslations('dashboard')

    const columns: TableColumn[] = [
        ...(isMedianHidden ? [] : [{ key: MEDIAN_KEY, label: t('median'), isBold: true }]),
        ...series.map((s) => ({ key: s.modelId, label: MODEL_BY_ID[s.modelId].name })),
    ]
    const rowLabels = steps.map((step) => formatTableStepLabel(step, timeZone, locale))

    const getCell = (i: number, { key }: TableColumn) => {
        if (key === MEDIAN_KEY) {
            return pairedRuns ? formatPairedMedian(pairedRuns, i, decimals) : formatNumber(stats.median[i], decimals)
        }

        const model = series.find((s) => s.modelId === key)!

        return pairedRuns
            ? formatPairedModel(pairedRuns, model.modelId, i, decimals)
            : formatNumber(model.values[i], decimals)
    }

    return (
        <FixedColumnTable
            timeLabel={t('time')}
            rowLabels={rowLabels}
            columns={columns}
            getCell={getCell}
            cellClassName={pairedRuns ? PAIRED_CELL_CLASS : CELL_CLASS}
        />
    )
}
