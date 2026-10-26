import en from '@fa/messages/catalogs/en.json'
import { LANGUAGE_NAMES } from '@fa/shared/languages'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { settingsStore } from '../lib/settings'
import { storage } from '../lib/storage'
import { SettingsScreen } from './SettingsScreen'

const mockQuota = { limit: 50, used: 45, resetsAt: '2026-10-14T00:00:00Z' }

jest.mock('@fa/api-client/hooks/useQuota', () => ({ useQuota: () => ({ data: mockQuota }) }))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const renderSettings = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <IntlProvider locale="en" messages={en} timeZone="UTC">
                <SettingsScreen />
                <PortalHost />
            </IntlProvider>
        </QueryClientProvider>,
    )

describe('SettingsScreen', () => {
    beforeEach(() => {
        storage.clearAll()
        settingsStore.reload()
    })

    it('marks the chosen language and theme, and keeps a new choice on the device', async () => {
        await renderSettings()

        expect(screen.getByRole('radio', { name: en.mobile.languageSystem })).toBeChecked()
        expect(screen.getByRole('radio', { name: en.mobile.themeSystem })).toBeChecked()

        await fireEvent.press(screen.getByRole('radio', { name: LANGUAGE_NAMES.uk }))
        await fireEvent.press(screen.getByText(en.mobile.themeDark))

        expect(settingsStore.get()).toMatchObject({ language: 'uk', theme: 'dark' })
        expect(screen.getByRole('radio', { name: LANGUAGE_NAMES.uk })).toBeChecked()
    })

    it('opens the contact form from the row beside the legal links', async () => {
        await renderSettings()
        await fireEvent.press(screen.getByRole('button', { name: en.contact.title }))

        expect(screen.getByRole('heading', { name: en.contact.title })).toBeOnTheScreen()
        expect(screen.getByLabelText(en.contact.email)).toBeOnTheScreen()
    })

    it('shows the requests left today on a bar', async () => {
        await renderSettings()

        const meter = screen.getByRole('progressbar', { name: en.shell.quota.label })

        expect(meter).toHaveAccessibilityValue({ now: 10, text: '5 of 50 requests left today' })
    })
})
