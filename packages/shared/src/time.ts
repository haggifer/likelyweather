import { HOUR_MS, STEP_HOURS } from './constants'
import { getOrCreate } from './memo'

const DATE_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>()
const HOUR_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

const getDateKeyFormatter = (timeZone: string) =>
    getOrCreate(
        DATE_KEY_FORMATTERS,
        timeZone,
        () => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }),
    )

const getHourFormatter = (timeZone: string) =>
    getOrCreate(
        HOUR_FORMATTERS,
        timeZone,
        () => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }),
    )

export const toIsoMinute = (date: Date) => `${date.toISOString().slice(0, 16)}Z`

export const floorToHours = (date: Date, hours: number) =>
    new Date(Math.floor(date.getTime() / (hours * HOUR_MS)) * hours * HOUR_MS)

export const floorToStep = (date: Date) => floorToHours(date, STEP_HOURS)

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR_MS)

// Whole hours elapsed, rounded down, so an age never reads older than it is.
export const getAgeHours = (from: string | Date, now: Date) =>
    Math.floor((now.getTime() - new Date(from).getTime()) / HOUR_MS)

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

export const getLocalDateKey = (iso: string, timeZone: string) => getDateKeyFormatter(timeZone).format(new Date(iso))

export const getLocalHour = (date: Date, timeZone: string) => Number(getHourFormatter(timeZone).format(date))
