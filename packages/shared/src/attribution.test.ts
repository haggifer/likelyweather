import { ATTRIBUTION_URLS } from './attribution'

describe('ATTRIBUTION_URLS', () => {
    it('links each provider over HTTPS', () => {
        for (const url of Object.values(ATTRIBUTION_URLS)) expect(new URL(url).protocol).toBe('https:')
    })
})
