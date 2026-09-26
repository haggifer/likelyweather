import { ChipTone } from '@/components/shell/StatusChip'
import { Run, RunStatus } from '@fa/shared/api'
import { ExternalLink } from 'lucide-react'

export const STATUS_TONES: Record<RunStatus, ChipTone> = { OK: 'ok', PARTIAL: 'warn', FAILED: 'fail' }

export const formatRunDuration = ({ startedAt, finishedAt }: Run) =>
    finishedAt ? `${((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000).toFixed(1)} s` : '–'

export const getRunOriginLabel = (run: Run, t: (key: string) => string, cityNames: Map<number, string>) =>
    run.origin === 'PREVIEW' && run.cityId
        ? `${t(`origins.${run.origin}`)} · ${cityNames.get(run.cityId) ?? run.cityId}`
        : t(`origins.${run.origin}`)

export const RunArchiveLink = ({ run }: { run: Run }) =>
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
