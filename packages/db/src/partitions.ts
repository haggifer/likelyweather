import { DAY_MS } from '@fa/shared/constants'
import type { PrismaClient } from './generated/prisma/client'

const WEEK_MS = 7 * DAY_MS
// 1970-01-05 was a Monday, so weeks start on Monday 00:00 UTC.
const MONDAY_EPOCH_MS = 4 * DAY_MS
const PARTITION_NAME = /^Forecast_p(\d{4})(\d{2})(\d{2})$/
// Dropping a partition locks the whole Forecast table, and every read queues behind a drop that waits for an open
// write: it gives up instead, and a later prune tries again.
const DROP_LOCK_TIMEOUT = '1s'

const toPartitionName = (weekStart: Date) => `Forecast_p${weekStart.toISOString().slice(0, 10).replaceAll('-', '')}`

const getPartitionWeekEnd = (name: string) => {
    const match = PARTITION_NAME.exec(name)

    if (!match) return null

    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + WEEK_MS
}

export const getWeekStart = (date: Date) =>
    new Date(Math.floor((date.getTime() - MONDAY_EPOCH_MS) / WEEK_MS) * WEEK_MS + MONDAY_EPOCH_MS)

export const getForecastPartitionNames = async (prisma: PrismaClient) => {
    const rows = await prisma.$queryRaw<{ name: string }[]>`
        SELECT c.relname AS name
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'Forecast'`

    return rows.map((r) => r.name)
}

// Two instances creating the same week at once can both pass IF NOT EXISTS; the loser fails on the catalog, which is
// fine as long as the partition exists afterwards.
const createPartition = async (prisma: PrismaClient, start: Date) => {
    const name = toPartitionName(start)
    const end = new Date(start.getTime() + WEEK_MS)

    try {
        await prisma.$executeRawUnsafe(
            `CREATE TABLE IF NOT EXISTS "${name}" PARTITION OF "Forecast" FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')`,
        )
    } catch (error) {
        const names = await getForecastPartitionNames(prisma)

        if (!names.includes(name)) throw error
    }
}

// The following week is created ahead too, so writes never hit a missing range.
export const ensureForecastPartitions = async (prisma: PrismaClient, issueTime: Date) => {
    const first = getWeekStart(issueTime)

    for (const start of [first, new Date(first.getTime() + WEEK_MS)]) await createPartition(prisma, start)
}

// Drops every weekly partition whose newest possible issue time is older than `retentionDays`.
export const dropExpiredForecastPartitions = async (prisma: PrismaClient, now: Date, retentionDays: number) => {
    const names = await getForecastPartitionNames(prisma)
    const cutoff = now.getTime() - retentionDays * DAY_MS
    const dropped: string[] = []

    for (const name of names) {
        const weekEnd = getPartitionWeekEnd(name)

        if (weekEnd === null || weekEnd > cutoff) continue

        await prisma.$transaction([
            prisma.$executeRawUnsafe(`SET LOCAL lock_timeout = '${DROP_LOCK_TIMEOUT}'`),
            prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`),
        ])
        dropped.push(name)
    }

    return dropped
}
