import { acquireLock } from './cache'
import { runScheduled } from './scheduled'

describe('runScheduled', () => {
    it('exits without collecting while another run holds the collector lock', async () => {
        const release = await acquireLock('collector', 60)
        const log = vi.fn()

        const result = await runScheduled({ log })

        expect(result).toBeNull()
        expect(log).toHaveBeenCalledWith('Collector lock is held by another run; exiting')

        await release!()
    })
})
