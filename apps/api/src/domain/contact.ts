import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { ContactRequest, DEFAULT_LOCALE } from '@fa/shared/api'
import { incrementWithinLimits } from './cache'
import { env } from './env'
import { getErrorMessage, HttpError } from './errors'
import { getDayStart, getNextDayStart } from './quota'

interface ContactMail {
    from: string
    to: string
    replyTo: string
    subject: string
    body: string
}

// SES sends at most 200 messages a day from a sandbox account; the app-wide cap stays below that, so the form never
// runs into SES's own limit and a flood is cut off before it reaches the operator's inbox.
export const DAILY_CONTACT_LIMIT = 3
export const DAILY_CONTACT_GLOBAL_LIMIT = 150

const GLOBAL_CLIENT = 'all'

let ses: SESv2Client | undefined

const getSes = () => (ses ??= new SESv2Client({}))

const getKey = (client: string, now: Date) => `contact:${client}:${getDayStart(now)}`

const trySpendContact = (client: string, now: Date) =>
    incrementWithinLimits(
        [getKey(client, now), getKey(GLOBAL_CLIENT, now)],
        [DAILY_CONTACT_LIMIT, DAILY_CONTACT_GLOBAL_LIMIT],
        getNextDayStart(now),
    )

const contactLimitReached = () =>
    new HttpError(429, 'contact_limit', 'The daily limit of contact messages is reached; it resets at 00:00 UTC.')

const contactFailed = () => new HttpError(502, 'contact_failed', 'The message could not be sent')

const toMail = (request: ContactRequest, from: string, to: string): ContactMail => ({
    from,
    to,
    replyTo: request.email,
    subject: `Likely Weather: a message from the ${request.source ?? 'web'} (${request.locale ?? DEFAULT_LOCALE})`,
    body: `${request.message}\n\n${request.email}`,
})

const toSendEmailCommand = ({ from, to, replyTo, subject, body }: ContactMail) =>
    new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        ReplyToAddresses: [replyTo],
        Content: {
            Simple: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: { Text: { Data: body, Charset: 'UTF-8' } },
            },
        },
    })

const sendWithSes = async (mail: ContactMail) => {
    try {
        await getSes().send(toSendEmailCommand(mail))
    } catch (error) {
        console.warn(`SES did not send a contact message: ${getErrorMessage(error)}`)
        throw contactFailed()
    }
}

const deliver = async (request: ContactRequest) => {
    const { CONTACT_EMAIL: to, CONTACT_FROM: from } = env

    if (to && from) return sendWithSes(toMail(request, from, to))

    // On AWS a missing setting is a deploy mistake, and a log line there would keep the visitor's message.
    if (process.env.SSM_PREFIX) throw contactFailed()

    console.info(`Contact message from ${request.email}, not sent (SES is not configured):\n${request.message}`)
}

// The unit is spent before SES is asked, in the same atomic step as the check, so parallel requests cannot pass the
// limit; a message SES then refuses still counts, which only matters while SES is failing anyway.
export const sendContactMessage = async (request: ContactRequest, client: string, now = new Date()) => {
    const isAllowed = await trySpendContact(client, now)

    if (!isAllowed) throw contactLimitReached()

    await deliver(request)
}
