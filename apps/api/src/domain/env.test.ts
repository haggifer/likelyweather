const DEFAULT_USER_AGENT = 'forecast-arena/1.0 (no contact configured)'

describe('env', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.stubEnv('SSM_PREFIX', '/forecast-arena')
        vi.stubEnv('METNO_USER_AGENT', DEFAULT_USER_AGENT)
        vi.stubEnv('REDIS_URL', '')
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    it('refuses to start on AWS with the anonymous met.no User-Agent', async () => {
        await expect(import('./env')).rejects.toThrow(/METNO_USER_AGENT/)
    })

    it('warns on AWS when Redis is not configured', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubEnv('METNO_USER_AGENT', 'forecast-arena/1.0 test@example.com')

        await import('./env')

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('REDIS_URL'))
    })

    it('accepts the defaults locally', async () => {
        vi.stubEnv('SSM_PREFIX', '')

        await expect(import('./env')).resolves.toMatchObject({ env: { METNO_USER_AGENT: DEFAULT_USER_AGENT } })
    })
})
