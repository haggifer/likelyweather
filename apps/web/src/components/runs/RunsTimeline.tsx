'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { formatTime, formatUtc } from '@fa/shared/format'
import { cn } from '@fa/ui/lib/utils'
import { TimelineResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { toIsoMinute } from '@fa/shared/time'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    timeline: TimelineResponse
    now: Date
}

type SlotState = 'OK' | 'PARTIAL' | 'FAILED' | 'PREVIEW' | 'MISSING' | 'FUTURE'

const DAY_MS = 86_400_000
const SLOT_HOURS = [0, 6, 12, 18]

const SLOT_CLASSES: Record<SlotState, string> = {
    OK: 'bg-success',
    PARTIAL: 'bg-warning',
    FAILED: 'bg-destructive',
    PREVIEW: 'bg-info/45',
    MISSING: 'border border-dashed border-muted-foreground/50 bg-transparent',
    FUTURE: 'bg-muted',
}

const getSlotState = (issueTime: string, timeline: TimelineResponse, now: Date): SlotState => {
    if (new Date(issueTime) > now) return 'FUTURE'

    const runs = timeline.runs.filter((r) => r.issueTime === issueTime)
    const scheduled = runs.find((r) => r.origin === 'SCHEDULED')

    if (scheduled) return scheduled.status

    return runs.length ? 'PREVIEW' : 'MISSING'
}

export default function RunsTimeline({ timeline, now }: IProps) {
    const t = useTranslations('runs')
    const locale = useLocale()
    const start = new Date(timeline.from)
    const firstDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    const dayCount = Math.ceil((new Date(timeline.to).getTime() - firstDay) / DAY_MS)
    const days = Array.from({ length: dayCount }, (_, i) => new Date(firstDay + i * DAY_MS))

    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto">
                <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `2.5rem repeat(${days.length}, 14px)` }}
                >
                    {SLOT_HOURS.map((hour) => (
                        <div key={hour} className="contents">
                            <span className="pr-1 text-right text-[10px] leading-[14px] text-muted-foreground">
                                {String(hour).padStart(2, '0')}Z
                            </span>
                            {days.map((day) => {
                                const issueTime = toIsoMinute(new Date(day.getTime() + hour * HOUR_MS))
                                const state = getSlotState(issueTime, timeline, now)

                                return (
                                    <Tooltip key={issueTime}>
                                        <TooltipTrigger asChild>
                                            <span
                                                tabIndex={0}
                                                aria-label={`${formatUtc(issueTime, locale)} UTC: ${t(`slot.${state}`)}`}
                                                className={cn('size-3.5 rounded-[3px]', SLOT_CLASSES[state])}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {formatUtc(issueTime, locale)} UTC · {t(`slot.${state}`)}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    ))}
                    <span />
                    {days.map((day, i) => (
                        <span key={day.toISOString()} className="text-center text-[9px] text-muted-foreground">
                            {i % 5 === 0 ? formatTime(day, 'UTC', locale, { day: 'numeric', month: 'numeric' }) : ''}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {(Object.keys(SLOT_CLASSES) as SlotState[]).map((state) => (
                    <span key={state} className="flex items-center gap-1.5">
                        <span className={cn('size-3 rounded-[3px]', SLOT_CLASSES[state])} />
                        {t(`slot.${state}`)}
                    </span>
                ))}
            </div>
        </div>
    )
}
