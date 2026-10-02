'use client'

import { formatRunTime, formatRunTimeUtc } from '@/components/runs/run-parts'
import { buildTimelineGrid, toCellKey } from '@/components/runs/timeline-grid'
import { TimelineResponse } from '@fa/shared/api'
import { formatDateKey, getViewerTimeZone } from '@fa/shared/format'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { cn } from '@fa/ui/lib/cn'
import { useLocale, useTranslations } from 'next-intl'

enum SlotState {
    Ok = 'OK',
    Partial = 'PARTIAL',
    Failed = 'FAILED',
    Preview = 'PREVIEW',
    Missing = 'MISSING',
    Future = 'FUTURE',
}

const DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }

const SLOT_CLASSES: Record<SlotState, string> = {
    [SlotState.Ok]: 'bg-success',
    [SlotState.Partial]: 'bg-warning',
    [SlotState.Failed]: 'bg-destructive',
    [SlotState.Preview]: 'bg-info/45',
    [SlotState.Missing]: 'border border-dashed border-muted-foreground/50 bg-transparent',
    [SlotState.Future]: 'bg-muted',
}

// The grid runs oldest to newest and is wider than a phone, so it opens scrolled to today.
const scrollToEnd = (node: HTMLDivElement | null) => {
    if (node) node.scrollLeft = node.scrollWidth
}

const getSlotState = (issueTime: string, timeline: TimelineResponse, now: Date): SlotState => {
    if (new Date(issueTime) > now) return SlotState.Future

    const runs = timeline.runs.filter((r) => r.issueTime === issueTime)
    const scheduled = runs.find((r) => r.origin === 'SCHEDULED')

    if (scheduled) return scheduled.status as SlotState

    return runs.length ? SlotState.Preview : SlotState.Missing
}

interface IProps {
    timeline: TimelineResponse
    now: Date
}

export function RunsTimeline({ timeline, now }: IProps) {
    const t = useTranslations('runs')
    const locale = useLocale()

    const { days, rows, cells } = buildTimelineGrid(timeline.from, timeline.to, now, getViewerTimeZone(), locale)

    return (
        <div className="flex flex-col gap-3">
            <div ref={scrollToEnd} className="overflow-x-auto">
                <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `2.5rem repeat(${days.length}, 0.875rem)` }}
                >
                    {rows.map(({ cycleHour, label }) => (
                        <div key={cycleHour} className="contents">
                            <span className="pr-1 text-right text-[0.625rem] leading-[0.875rem] text-muted-foreground">
                                {label}
                            </span>
                            {days.map((day) => {
                                const issueTime = cells.get(toCellKey(day, cycleHour))

                                if (!issueTime) return <span key={day} />

                                const state = getSlotState(issueTime, timeline, now)
                                const text = `${formatRunTime(issueTime, locale)} · ${t(`slot.${state}`)}`

                                return (
                                    <Tooltip key={day}>
                                        <TooltipTrigger asChild>
                                            <span
                                                tabIndex={0}
                                                aria-label={text}
                                                className={cn('size-3.5 rounded-[0.1875rem]', SLOT_CLASSES[state])}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {text} ({formatRunTimeUtc(issueTime, locale)})
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    ))}
                    <span />
                    {days.map((day, i) => (
                        <span key={day} className="text-center text-[0.5625rem] text-muted-foreground">
                            {i % 5 === 0 ? formatDateKey(day, locale, DAY_LABEL_FORMAT) : ''}
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
