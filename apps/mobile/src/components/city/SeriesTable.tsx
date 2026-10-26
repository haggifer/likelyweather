import { Series } from '@fa/shared/api'
import { EnsembleStats } from '@fa/shared/ensemble'
import { formatNumber } from '@fa/shared/format'
import { MODEL_BY_ID } from '@fa/shared/models'
import { formatPairedMedian, formatPairedModel, PairedRuns } from '@fa/shared/paired-values'
import { useTranslations } from 'use-intl'
import { TimeTable } from '../charts/TimeTable'
import { TimeTableRow } from '../charts/types'

// The slot columns are 72 px wide, or 104 for a pair's "actual (companion)".
const COLUMN_CLASS = 'w-[4.5rem]'
const PAIRED_COLUMN_CLASS = 'w-[6.5rem]'

const getMedianCells = (steps: string[], stats: EnsembleStats, pairedRuns: PairedRuns | null, decimals: number) =>
    steps.map((_, i) =>
        pairedRuns ? formatPairedMedian(pairedRuns, i, decimals) : formatNumber(stats.median[i], decimals),
    )

const getModelCells = (steps: string[], model: Series, pairedRuns: PairedRuns | null, decimals: number) =>
    steps.map((_, i) =>
        pairedRuns
            ? formatPairedModel(pairedRuns, model.modelId, i, decimals)
            : formatNumber(model.values[i], decimals),
    )

interface IProps {
    steps: string[]
    series: Series[]
    stats: EnsembleStats
    decimals: number
    timeZone: string
    locale: string
    // A pair reads "actual (companion)" whichever sub-tab is open.
    pairedRuns: PairedRuns | null
    // The median's eye in the legend hides its row too.
    isMedianHidden: boolean
}

export function SeriesTable({ steps, series, stats, decimals, timeZone, locale, pairedRuns, isMedianHidden }: IProps) {
    const t = useTranslations('dashboard')

    const medianRow: TimeTableRow = {
        key: 'median',
        label: t('median'),
        isBold: true,
        cells: getMedianCells(steps, stats, pairedRuns, decimals),
    }
    const modelRows = series.map((model): TimeTableRow => ({
        key: model.modelId,
        label: MODEL_BY_ID[model.modelId].name,
        cells: getModelCells(steps, model, pairedRuns, decimals),
    }))
    const rows = isMedianHidden ? modelRows : [medianRow, ...modelRows]

    return (
        <TimeTable
            steps={steps}
            timeZone={timeZone}
            locale={locale}
            rows={rows}
            columnClassName={pairedRuns ? PAIRED_COLUMN_CLASS : COLUMN_CLASS}
        />
    )
}
