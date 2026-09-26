import { getPrisma, loadLocalEnv } from './client'
import { dropExpiredForecastPartitions, ensureForecastPartitions, getWeekStart } from './partitions'

loadLocalEnv()

describe('weekly partitions', () => {
    it('starts a week on Monday 00:00 UTC', () => {
        expect(getWeekStart(new Date('2026-09-26T18:00Z')).toISOString()).toBe('2026-09-21T00:00:00.000Z')
        expect(getWeekStart(new Date('2026-09-21T00:00Z')).toISOString()).toBe('2026-09-21T00:00:00.000Z')
        expect(getWeekStart(new Date('2026-09-20T23:59Z')).toISOString()).toBe('2026-09-14T00:00:00.000Z')
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('partition maintenance (database)', () => {
    const prisma = getPrisma()
    const listPartitions = async () =>
        (
            await prisma.$queryRaw<{ name: string }[]>`
                SELECT c.relname AS name FROM pg_inherits i
                JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent
                WHERE p.relname = 'Forecast'`
        ).map((r) => r.name)

    afterAll(() => prisma.$disconnect())

    it('creates the week of an issue time and the next one, and drops weeks past retention', async () => {
        await ensureForecastPartitions(prisma, new Date('2020-01-08T06:00Z'))

        expect(await listPartitions()).toEqual(expect.arrayContaining(['Forecast_p20200106', 'Forecast_p20200113']))

        const dropped = await dropExpiredForecastPartitions(prisma, new Date('2020-01-30T00:00Z'), 14)

        expect(dropped).toEqual(['Forecast_p20200106'])
        expect(await listPartitions()).toContain('Forecast_p20200113')

        await dropExpiredForecastPartitions(prisma, new Date('2020-02-20T00:00Z'), 14)

        expect(await listPartitions()).not.toContain('Forecast_p20200113')
    })
})
