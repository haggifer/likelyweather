import type { PrismaClient } from './generated/prisma/client'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
// 1970-01-05 was a Monday, so weeks start on Monday 00:00 UTC.
const MONDAY_EPOCH_MS = 4 * DAY_MS

export const getWeekStart = (date: Date) =>
    new Date(Math.floor((date.getTime() - MONDAY_EPOCH_MS) / WEEK_MS) * WEEK_MS + MONDAY_EPOCH_MS)

const toPartitionName = (weekStart: Date) => `Forecast_p${weekStart.toISOString().slice(0, 10).replaceAll('-', '')}`

// Creates the weekly partitions covering `issueTime` and the following week, so writes never hit a missing range.
export const ensureForecastPartitions = async (prisma: PrismaClient, issueTime: Date) => {
    const first = getWeekStart(issueTime)

    for (const start of [first, new Date(first.getTime() + WEEK_MS)]) {
        const end = new Date(start.getTime() + WEEK_MS)
        await prisma.$executeRawUnsafe(
            `CREATE TABLE IF NOT EXISTS "${toPartitionName(start)}" PARTITION OF "Forecast" FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')`,
        )
    }
}

// Drops every weekly partition whose newest possible issue time is older than `retentionDays`.
export const dropExpiredForecastPartitions = async (prisma: PrismaClient, now: Date, retentionDays: number) => {
    const cutoff = now.getTime() - retentionDays * DAY_MS
    const partitions = await prisma.$queryRaw<{ name: string }[]>`
        SELECT c.relname AS name
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'Forecast'`
    const dropped: string[] = []

    for (const { name } of partitions) {
        const match = /^Forecast_p(\d{4})(\d{2})(\d{2})$/.exec(name)

        if (!match) continue

        const weekEnd = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + WEEK_MS

        if (weekEnd > cutoff) continue

        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`)
        dropped.push(name)
    }

    return dropped
}
