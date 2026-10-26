import { apiPost, ApiRequestError } from '@fa/api-client/api'
import en from '@fa/messages/catalogs/en.json'
import { CONTACT_MESSAGE_MAX } from '@fa/shared/api'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { showSnackbar } from '../../lib/snackbar-store'
import { ContactDialog } from './ContactDialog'

jest.mock('@fa/api-client/api', () => ({
    ...jest.requireActual<object>('@fa/api-client/api'),
    apiPost: jest.fn(),
}))
jest.mock('../../lib/snackbar-store', () => ({ showSnackbar: jest.fn() }))

let client: QueryClient

const getTree = (isOpen: boolean, onOpenChange: (isOpen: boolean) => void) => (
    <QueryClientProvider client={client}>
        <IntlProvider locale="en" messages={en}>
            <ContactDialog isOpen={isOpen} onOpenChange={onOpenChange} />
            <PortalHost />
        </IntlProvider>
    </QueryClientProvider>
)

const renderDialog = (onOpenChange = jest.fn()) => render(getTree(true, onOpenChange))

// A reply the test hands over when it chooses, so the reader can close the dialog while the message is on its way.
const holdReply = () => {
    const reply = Promise.withResolvers<unknown>()
    jest.mocked(apiPost).mockReturnValue(reply.promise)

    return reply
}

const getSend = () => screen.getByRole('button', { name: en.contact.send })

const fillIn = async (email: string, message: string) => {
    await fireEvent.changeText(screen.getByLabelText(en.contact.email), email)
    await fireEvent.changeText(screen.getByLabelText(en.contact.message), message)
}

const sendAndClose = async (onOpenChange: jest.Mock) => {
    await renderDialog(onOpenChange)
    await fillIn('reader@example.com', 'Hello')
    await fireEvent.press(getSend())
    await screen.rerender(getTree(false, onOpenChange))
}

describe('ContactDialog', () => {
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })
    })

    afterEach(() => jest.resetAllMocks())

    it('keeps Send disabled until both fields are filled and the address is valid', async () => {
        await renderDialog()

        expect(screen.getByPlaceholderText(en.contact.emailPlaceholder)).toBeOnTheScreen()
        expect(screen.getByPlaceholderText(en.contact.messagePlaceholder)).toBeOnTheScreen()
        expect(getSend()).toBeDisabled()

        await fillIn('reader@example.com', '')

        expect(getSend()).toBeDisabled()

        await fillIn('reader@example', 'Hello')

        expect(getSend()).toBeDisabled()

        await fillIn('reader@example.com', 'Hello')

        expect(getSend()).toBeEnabled()
    })

    it('sends the trimmed address and the message, closes and thanks the reader in a snackbar', async () => {
        const onOpenChange = jest.fn()
        jest.mocked(apiPost).mockResolvedValue({ ok: true })
        await renderDialog(onOpenChange)

        await fillIn(' reader@example.com ', 'Hello')
        await fireEvent.press(getSend())

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(showSnackbar).toHaveBeenCalledWith(en.contact.sent, [], { kind: 'success' })
        expect(apiPost).toHaveBeenCalledWith('/contact', {
            email: 'reader@example.com',
            message: 'Hello',
        })
    })

    it('thanks the reader in a snackbar after they closed the dialog mid-send', async () => {
        const onOpenChange = jest.fn()
        const reply = holdReply()

        await sendAndClose(onOpenChange)
        reply.resolve({ ok: true })

        await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(en.contact.sent, [], { kind: 'success' }))
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it('leaves a dialog opened again mid-send, and its text, alone when the first message is sent', async () => {
        const onOpenChange = jest.fn()
        const reply = holdReply()

        await sendAndClose(onOpenChange)
        await screen.rerender(getTree(true, onOpenChange))
        await fireEvent.changeText(screen.getByLabelText(en.contact.message), 'A second thought')
        reply.resolve({ ok: true })

        await waitFor(() => expect(showSnackbar).toHaveBeenCalledTimes(1))
        expect(onOpenChange).not.toHaveBeenCalled()
        expect(screen.getByDisplayValue('A second thought')).toBeOnTheScreen()
    })

    it('says in a snackbar that the message was not sent when the dialog was closed mid-send', async () => {
        const reply = holdReply()

        await sendAndClose(jest.fn())
        reply.reject(new ApiRequestError(429, 'contact_limit', 'limit'))

        await waitFor(() =>
            expect(showSnackbar).toHaveBeenCalledWith(
                en.contact.notSent.replace('{reason}', en.errors.contactLimit),
                [],
                { kind: 'error' },
            ),
        )
    })

    it('says when the daily limit of messages is reached', async () => {
        jest.mocked(apiPost).mockRejectedValue(new ApiRequestError(429, 'contact_limit', 'limit'))
        await renderDialog()

        await fillIn('reader@example.com', 'Hello')
        await fireEvent.press(getSend())

        await waitFor(() => expect(screen.getByText(en.errors.contactLimit)).toBeOnTheScreen())
        expect(getSend()).toBeEnabled()
        expect(showSnackbar).not.toHaveBeenCalled()
    })

    it('says the address is invalid once the reader leaves the field, and stops saying it once it is fixed', async () => {
        await renderDialog()
        const email = screen.getByLabelText(en.contact.email)

        await fireEvent.changeText(email, 'reader@example')

        expect(screen.queryByText(en.contact.emailInvalid)).toBeNull()

        await fireEvent(email, 'blur')

        expect(screen.getByText(en.contact.emailInvalid)).toBeOnTheScreen()

        await fireEvent.changeText(email, 'reader@example.com')

        expect(screen.queryByText(en.contact.emailInvalid)).toBeNull()
    })

    it('counts the message against its limit', async () => {
        await renderDialog()

        await fillIn('', 'Hello')

        expect(screen.getByText(`5/${CONTACT_MESSAGE_MAX}`)).toBeOnTheScreen()
    })
})
