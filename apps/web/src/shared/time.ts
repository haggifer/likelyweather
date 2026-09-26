import { HOUR_MS, STEP_HOURS } from '@/shared/constants'

export const toIsoMinute = (date: Date) => `${date.toISOString().slice(0, 16)}Z`

export const floorToHours = (date: Date, hours: number) =>
    new Date(Math.floor(date.getTime() / (hours * HOUR_MS)) * hours * HOUR_MS)

export const floorToStep = (date: Date) => floorToHours(date, STEP_HOURS)

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR_MS)

export const hoursBetween = (from: string | Date, to: string | Date) =>
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / HOUR_MS)

export const buildSteps = (start: Date, end: Date, stepHours = STEP_HOURS) => {
    const steps: string[] = []

    for (let t = floorToHours(start, stepHours).getTime(); t <= end.getTime(); t += stepHours * HOUR_MS) {
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

const HOUR_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

export const getLocalHour = (date: Date, timeZone: string) => {
    let formatter = HOUR_FORMATTERS.get(timeZone)

    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' })
        HOUR_FORMATTERS.set(timeZone, formatter)
    }

    return Number(formatter.format(date))
}
