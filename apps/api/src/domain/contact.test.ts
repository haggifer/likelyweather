import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { ContactRequest, Locale } from '@fa/shared/api'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('@aws-sdk/client-sesv2', async (importOriginal) => {
    const original = await importOriginal<typeof import('@aws-sdk/client-sesv2')>()

    return {
        ...original,
        SESv2Client: class {
            send = send
        },
    }
})

const REQUEST: ContactRequest = {
    email: 'reader@example.com',
    message: 'The chart is great.',
    locale: Locale.Uk,
    source: 'app',
}
const NOON = new Date('2031-03-01T12:00:00Z')

const importContact = async () => {
    vi.resetModules()

    return import('./contact')
}

describe('contact messages', () => {
    beforeEach(() => {
        send.mockReset()
        vi.stubEnv('CONTACT_EMAIL', 'owner@example.com')
        vi.stubEnv('CONTACT_FROM', 'Likely Weather <noreply@likelyweather.com>')
    })

    afterEach(() => {
        vi.doUnmock('./cache')
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    it('sends the message to the operator with the visitor as Reply-To', async () => {
        const { sendContactMessage } = await importContact()

        await sendContactMessage(REQUEST, 'sender-a', NOON)

        const [command] = send.mock.calls[0] as [SendEmailCommand]

        expect(command.input).toMatchObject({
            FromEmailAddress: 'Likely Weather <noreply@likelyweather.com>',
            Destination: { ToAddresses: ['owner@example.com'] },
            ReplyToAddresses: ['reader@example.com'],
            Content: {
                Simple: {
                    Subject: { Data: 'Likely Weather: a message from the app (uk)' },
                    Body: { Text: { Data: 'The chart is great.\n\nreader@example.com' } },
                },
            },
        })
    })

    it('allows three messages per client a day, then answers 429 until the next UTC day', async () => {
        const { DAILY_CONTACT_LIMIT, sendContactMessage } = await importContact()

        for (let i = 0; i < DAILY_CONTACT_LIMIT; i++) await sendContactMessage(REQUEST, 'sender-b', NOON)

        await expect(sendContactMessage(REQUEST, 'sender-b', NOON)).rejects.toMatchObject({
            status: 429,
            code: 'contact_limit',
        })
        await expect(sendContactMessage(REQUEST, 'sender-c', NOON)).resolves.toBeUndefined()
        await expect(sendContactMessage(REQUEST, 'sender-b', new Date('2031-03-02T00:10:00Z'))).resolves.toBeUndefined()
        expect(send).toHaveBeenCalledTimes(DAILY_CONTACT_LIMIT + 2)
    })

    it('stops every client once the app-wide daily cap is used', async () => {
        const { DAILY_CONTACT_GLOBAL_LIMIT, DAILY_CONTACT_LIMIT, sendContactMessage } = await importContact()
        const day = new Date('2031-04-01T12:00:00Z')

        for (let i = 0; i < DAILY_CONTACT_GLOBAL_LIMIT; i++) {
            await sendContactMessage(REQUEST, `crowd-${Math.floor(i / DAILY_CONTACT_LIMIT)}`, day)
        }

        await expect(sendContactMessage(REQUEST, 'newcomer', day)).rejects.toMatchObject({ status: 429 })
    })

    it('answers 502 when SES refuses, and the attempt still counts', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        send.mockRejectedValue(new Error('Email address is not verified'))
        const { DAILY_CONTACT_LIMIT, sendContactMessage } = await importContact()
        const day = new Date('2031-05-01T12:00:00Z')

        for (let i = 0; i < DAILY_CONTACT_LIMIT; i++) {
            await expect(sendContactMessage(REQUEST, 'sender-d', day)).rejects.toMatchObject({
                status: 502,
                code: 'contact_failed',
            })
        }

        await expect(sendContactMessage(REQUEST, 'sender-d', day)).rejects.toMatchObject({ status: 429 })
    })

    it('logs the message instead of sending it when SES is not configured locally', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {})
        vi.stubEnv('CONTACT_EMAIL', '')
        const { sendContactMessage } = await importContact()

        await sendContactMessage(REQUEST, 'sender-e', NOON)

        expect(send).not.toHaveBeenCalled()
        expect(info).toHaveBeenCalledWith(expect.stringContaining('The chart is great.'))
    })

    it('answers 502 on AWS without the settings, and logs nothing of the message', async () => {
        vi.doMock('./cache', () => ({ tryIncrementWithinLimits: async () => true }))
        vi.stubEnv('REDIS_URL', 'rediss://cache.example.com')
        const info = vi.spyOn(console, 'info').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubEnv('CONTACT_EMAIL', '')
        vi.stubEnv('SSM_PREFIX', '/forecast-arena')
        vi.stubEnv('METNO_USER_AGENT', 'likelyweather/1.0 test@example.com')
        const { sendContactMessage } = await importContact()

        await expect(sendContactMessage(REQUEST, 'sender-f', NOON)).rejects.toMatchObject({ status: 502 })
        expect(info).not.toHaveBeenCalled()
        expect(send).not.toHaveBeenCalled()
    })

    it('answers 503 and sends nothing when Redis cannot keep the count', async () => {
        vi.doMock('./cache', () => ({ tryIncrementWithinLimits: async () => null }))
        const { sendContactMessage } = await importContact()

        await expect(sendContactMessage(REQUEST, 'sender-g', NOON)).rejects.toMatchObject({
            status: 503,
            code: 'contact_unavailable',
        })
        expect(send).not.toHaveBeenCalled()
    })

    it('answers 503 on AWS without Redis, where each instance would count alone', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubEnv('SSM_PREFIX', '/forecast-arena')
        vi.stubEnv('METNO_USER_AGENT', 'likelyweather/1.0 test@example.com')
        const { sendContactMessage } = await importContact()

        await expect(sendContactMessage(REQUEST, 'sender-h', NOON)).rejects.toMatchObject({ status: 503 })
        expect(send).not.toHaveBeenCalled()
    })
})
