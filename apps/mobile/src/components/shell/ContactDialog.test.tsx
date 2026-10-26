import { apiPost, ApiRequestError } from '@fa/api-client/api'
import en from '@fa/messages/catalogs/en.json'
import { CONTACT_MESSAGE_MAX } from '@fa/shared/api'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { ContactDialog } from './ContactDialog'

jest.mock('@fa/api-client/api', () => ({
    ...jest.requireActual<object>('@fa/api-client/api'),
    apiPost: jest.fn(),
}))

const renderDialog = () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })

    return render(
        <QueryClientProvider client={client}>
            <IntlProvider locale="en" messages={en}>
                <ContactDialog isOpen onOpenChange={jest.fn()} />
                <PortalHost />
            </IntlProvider>
        </QueryClientProvider>,
    )
}

const getSend = () => screen.getByRole('button', { name: en.contact.send })

const fillIn = async (email: string, message: string) => {
    await fireEvent.changeText(screen.getByLabelText(en.contact.email), email)
    await fireEvent.changeText(screen.getByLabelText(en.contact.message), message)
}

describe('ContactDialog', () => {
    afterEach(() => jest.mocked(apiPost).mockReset())

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

    it('sends the trimmed address and the message, and thanks the reader', async () => {
        jest.mocked(apiPost).mockResolvedValue({ ok: true })
        await renderDialog()

        await fillIn(' reader@example.com ', 'Hello')
        await fireEvent.press(getSend())

        await waitFor(() => expect(screen.getByText(en.contact.sent)).toBeOnTheScreen())
        expect(apiPost).toHaveBeenCalledWith('/contact', {
            email: 'reader@example.com',
            message: 'Hello',
        })
    })

    it('says when the daily limit of messages is reached', async () => {
        jest.mocked(apiPost).mockRejectedValue(new ApiRequestError(429, 'contact_limit', 'limit'))
        await renderDialog()

        await fillIn('reader@example.com', 'Hello')
        await fireEvent.press(getSend())

        await waitFor(() => expect(screen.getByText(en.errors.contactLimit)).toBeOnTheScreen())
        expect(getSend()).toBeEnabled()
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
