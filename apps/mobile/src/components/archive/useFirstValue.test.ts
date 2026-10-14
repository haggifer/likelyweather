import { useFirstValue } from '@fa/hooks/useFirstValue'
import { renderHook } from '@testing-library/react-native'

const OPENED = new Date('2026-10-13T21:59:00Z')
const AFTER_MIDNIGHT = new Date('2026-10-13T22:01:00Z')

describe('useFirstValue', () => {
    it('keeps the first value once there is one, so the archive keeps the day it opened on', async () => {
        const { result, rerender } = await renderHook(({ now }: { now: Date | null }) => useFirstValue(now), {
            initialProps: { now: null as Date | null },
        })

        expect(result.current).toBeNull()

        await rerender({ now: OPENED })

        expect(result.current).toBe(OPENED)

        await rerender({ now: AFTER_MIDNIGHT })

        expect(result.current).toBe(OPENED)
    })
})
