import en from '@fa/messages/catalogs/en.json'
import uk from '@fa/messages/catalogs/uk.json'
import { ArchiveRange, formatArchiveRange } from '@fa/shared/archive'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { IntlProvider } from 'use-intl'
import { ArchivePeriodPicker } from './ArchivePeriodPicker'

const RANGE: ArchiveRange = { from: '2026-10-05', to: '2026-10-11' }
const LATEST = '2026-10-11'

const getPeriodName = (range: ArchiveRange) => en.archive.periodValue.replace('{range}', formatArchiveRange(range))

const openPicker = async (onChange: (range: ArchiveRange) => void) => {
    await render(
        <IntlProvider locale="en" messages={en}>
            <ArchivePeriodPicker range={RANGE} latest={LATEST} onChange={onChange} />
            <PortalHost />
        </IntlProvider>,
    )
    await fireEvent.press(screen.getByRole('button', { name: getPeriodName(RANGE) }))
}

describe('ArchivePeriodPicker', () => {
    beforeEach(() => {
        // The popover opens where the layout puts its button; the test renderer has no layout to measure.
        jest.spyOn(View.prototype, 'measure').mockImplementation((callback) => callback(0, 0, 200, 40, 16, 120))
    })

    it('shows the period as DD.MM.YYYY whatever the language', async () => {
        await render(
            <IntlProvider locale="uk" messages={uk}>
                <ArchivePeriodPicker range={RANGE} latest={LATEST} onChange={jest.fn()} />
            </IntlProvider>,
        )

        expect(screen.getByText('05.10.2026 – 11.10.2026')).toBeOnTheScreen()
    })

    it('starts the period on the first tap and applies it on the second, closing the calendar', async () => {
        const onChange = jest.fn()
        await openPicker(onChange)

        expect(screen.getByText('October 2026')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: 'Thursday, October 1, 2026' }))

        expect(onChange).not.toHaveBeenCalled()

        await fireEvent.press(screen.getByRole('button', { name: 'Saturday, October 3, 2026' }))

        expect(onChange).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-03' })
        expect(screen.queryByText('October 2026')).toBeNull()
    })

    it('ends a period within 12 days of its first day and never before it', async () => {
        await openPicker(jest.fn())
        await fireEvent.press(screen.getByRole('button', { name: en.archive.previousMonth }))

        expect(screen.getByText('September 2026')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: 'Tuesday, September 8, 2026' }))

        expect(screen.getByRole('button', { name: 'Saturday, September 19, 2026' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Sunday, September 20, 2026' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Monday, September 7, 2026' })).toBeDisabled()
    })

    it('steps a year at a time, stopping at yesterday', async () => {
        await openPicker(jest.fn())
        await fireEvent.press(screen.getByRole('button', { name: en.archive.previousYear }))

        expect(screen.getByText('October 2025')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: en.archive.nextMonth }))
        await fireEvent.press(screen.getByRole('button', { name: en.archive.nextYear }))

        expect(screen.getByText('October 2026')).toBeOnTheScreen()
    })

    it('offers nothing after yesterday', async () => {
        await openPicker(jest.fn())

        expect(screen.getByRole('button', { name: 'Monday, October 12, 2026' })).toBeDisabled()
        expect(screen.getByRole('button', { name: en.archive.nextMonth })).toBeDisabled()
        expect(screen.getByRole('button', { name: en.archive.nextYear })).toBeDisabled()
        expect(screen.getByText(en.archive.limit.replace('{days}', '12'))).toBeOnTheScreen()
    })
})
