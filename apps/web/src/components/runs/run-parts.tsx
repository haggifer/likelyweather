import { ChipTone } from '@/components/types'
import { Run, RunStatus } from '@fa/shared/api'
import { formatDateTime, getViewerTimeZone } from '@fa/shared/format'
import { ExternalLink } from 'lucide-react'

export const STATUS_TONES: Record<RunStatus, ChipTone> = {
    OK: ChipTone.Ok,
    PARTIAL: ChipTone.Warn,
    FAILED: ChipTone.Fail,
}

export const formatRunDuration = ({ startedAt, finishedAt }: Run) =>
    finishedAt ? `${((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000).toFixed(1)} s` : '–'

// A run belongs to no city, so its time is shown in the viewer's zone; UTC, the time model runs are named by, is the
// hover text.
export const formatRunTime = (issueTime: string, locale: string) =>
    formatDateTime(issueTime, getViewerTimeZone(), locale)

export const formatRunTimeUtc = (issueTime: string, locale: string) => `${formatDateTime(issueTime, 'UTC', locale)} UTC`

export const getRunOriginLabel = (run: Run, t: (key: string) => string, cityNames: Map<number, string>) =>
    run.origin === 'PREVIEW' && run.cityId
        ? `${t(`origins.${run.origin}`)} · ${cityNames.get(run.cityId) ?? run.cityId}`
        : t(`origins.${run.origin}`)

interface IProps {
    run: Run
}

export const RunArchiveLink = ({ run }: IProps) =>
    run.archivePath ? (
        <a
            href={`/api/runs/${run.id}/archive`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
        >
            JSON <ExternalLink className="size-3" />
        </a>
    ) : (
        '–'
    )
