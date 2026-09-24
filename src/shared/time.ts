import { HOUR_MS, STEP_MS } from '@/shared/constants'

export const toIsoMinute = (date: Date) => `${date.toISOString().slice(0, 16)}Z`

export const floorToStep = (date: Date) => new Date(Math.floor(date.getTime() / STEP_MS) * STEP_MS)

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR_MS)

export const hoursBetween = (from: string | Date, to: string | Date) =>
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / HOUR_MS)

export const buildSteps = (start: Date, end: Date) => {
    const steps: string[] = []

    for (let t = floorToStep(start).getTime(); t <= end.getTime(); t += STEP_MS) {
        steps.push(toIsoMinute(new Date(t)))
    }

    return steps
}

export const compactIso = (iso: string) => iso.replace(/[-:]/g, '')

export const toUtcDate = (date: Date) => date.toISOString().slice(0, 10)

const DATE_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

export const getLocalDateKey = (iso: string, timeZone: string) => {
    let formatter = DATE_KEY_FORMATTERS.get(timeZone)

    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        DATE_KEY_FORMATTERS.set(timeZone, formatter)
    }

    return formatter.format(new Date(iso))
}
