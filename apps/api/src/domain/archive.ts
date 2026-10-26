import { ArchiveResponse, City } from '@fa/shared/api'
import {
    ARCHIVE_FIELDS,
    ArchiveRange,
    getArchiveHours,
    getLatestArchiveDate,
    isValidArchiveRange,
} from '@fa/shared/archive'
import { HOUR_MS } from '@fa/shared/constants'
import { toIsoMinute } from '@fa/shared/time'
import { HttpError } from './errors'
import { ArchiveHourValues, fetchArchiveHours } from './sources/open-meteo-archive'
import { readArchiveHours, writeArchiveHours } from './store'

const toArchiveResponse = (range: ArchiveRange, start: Date, end: Date, hours: ArchiveHourValues[]) => {
    const byTime = new Map(hours.map((h) => [h.time.getTime(), h.values]))
    const count = (end.getTime() - start.getTime()) / HOUR_MS
    const times = Array.from({ length: count }, (_, i) => start.getTime() + i * HOUR_MS)

    return {
        ...range,
        steps: times.map((t) => toIsoMinute(new Date(t))),
        values: Object.fromEntries(
            ARCHIVE_FIELDS.map(({ field }) => [field, times.map((t) => byTime.get(t)?.[field] ?? null)]),
        ),
    } as ArchiveResponse
}

// Every hour has a temperature, so the answer will not change and may be cached.
export const isCompleteArchive = (archive: ArchiveResponse) => archive.values.temp.every((v) => v !== null)

// `spendQuota` throws when the quota is used up. One unit covers a fetch: a range is at most 12 days, which Open-Meteo
// counts as one call. Hours without a temperature yet are not stored, so they are asked for again next time.
export const getArchivePayload = async (
    city: City,
    range: ArchiveRange,
    spendQuota: () => Promise<void>,
    now = new Date(),
): Promise<ArchiveResponse> => {
    if (!isValidArchiveRange(range, getLatestArchiveDate(now, city.timezone))) {
        throw new HttpError(400, 'invalid_range', 'The period must be up to 12 whole days between 1940 and yesterday')
    }

    const { start, end } = getArchiveHours(range, city.timezone)
    const expected = (end.getTime() - start.getTime()) / HOUR_MS
    const stored = await readArchiveHours(city.id, start, end)

    if (stored.length >= expected) return toArchiveResponse(range, start, end, stored)

    await spendQuota()

    const fetched = await fetchArchiveHours(city, start, end)

    await writeArchiveHours(
        city.id,
        fetched.filter((h) => h.values.temp !== null),
    )

    return toArchiveResponse(range, start, end, fetched)
}
