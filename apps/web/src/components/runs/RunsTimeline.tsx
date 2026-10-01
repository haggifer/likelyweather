'use client'

import { TimelineResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { formatTime, formatUtc } from '@fa/shared/format'
import { toIsoMinute } from '@fa/shared/time'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { cn } from '@fa/ui/lib/cn'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    timeline: TimelineResponse
    now: Date
}

enum SlotState {
    Ok = 'OK',
    Partial = 'PARTIAL',
    Failed = 'FAILED',
    Preview = 'PREVIEW',
    Missing = 'MISSING',
    Future = 'FUTURE',
}

const DAY_MS = 86_400_000
const SLOT_HOURS = [0, 6, 12, 18]

// The grid runs oldest to newest and is wider than a phone, so it opens scrolled to today.
const scrollToEnd = (node: HTMLDivElement | null) => {
    if (node) node.scrollLeft = node.scrollWidth
}

const SLOT_CLASSES: Record<SlotState, string> = {
    [SlotState.Ok]: 'bg-success',
    [SlotState.Partial]: 'bg-warning',
    [SlotState.Failed]: 'bg-destructive',
    [SlotState.Preview]: 'bg-info/45',
    [SlotState.Missing]: 'border border-dashed border-muted-foreground/50 bg-transparent',
    [SlotState.Future]: 'bg-muted',
}

const getSlotState = (issueTime: string, timeline: TimelineResponse, now: Date): SlotState => {
    if (new Date(issueTime) > now) return SlotState.Future

    const runs = timeline.runs.filter((r) => r.issueTime === issueTime)
    const scheduled = runs.find((r) => r.origin === 'SCHEDULED')

    if (scheduled) return scheduled.status as SlotState

    return runs.length ? SlotState.Preview : SlotState.Missing
}

export function RunsTimeline({ timeline, now }: IProps) {
    const t = useTranslations('runs')
    const locale = useLocale()
    const start = new Date(timeline.from)
    const firstDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    const dayCount = Math.ceil((new Date(timeline.to).getTime() - firstDay) / DAY_MS)
    const days = Array.from({ length: dayCount }, (_, i) => new Date(firstDay + i * DAY_MS))

    return (
        <div className="flex flex-col gap-3">
            <div ref={scrollToEnd} className="overflow-x-auto">
                <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `2.5rem repeat(${days.length}, 14px)` }}
                >
                    {SLOT_HOURS.map((hour) => (
                        <div key={hour} className="contents">
                            <span className="pr-1 text-right text-[0.625rem] leading-[0.875rem] text-muted-foreground">
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
                                                className={cn('size-3.5 rounded-[0.1875rem]', SLOT_CLASSES[state])}
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
                        <span key={day.toISOString()} className="text-center text-[0.5625rem] text-muted-foreground">
                            {i % 5 === 0 ? formatTime(day, 'UTC', locale, { day: 'numeric', month: 'numeric' }) : ''}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-3 text-[0.6875rem] text-muted-foreground">
                {(Object.keys(SLOT_CLASSES) as SlotState[]).map((state) => (
                    <span key={state} className="flex items-center gap-1.5">
                        <span className={cn('size-3 rounded-[0.1875rem]', SLOT_CLASSES[state])} />
                        {t(`slot.${state}`)}
                    </span>
                ))}
            </div>
        </div>
    )
}
