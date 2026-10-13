import en from '@fa/messages/catalogs/en.json'
import { ArchiveRange } from '@fa/shared/archive'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { ArchivePeriodPicker } from './ArchivePeriodPicker'

const RANGE: ArchiveRange = { from: '2026-10-05', to: '2026-10-11' }
const LATEST = '2026-10-11'

const renderPicker = (onChange: (range: ArchiveRange) => void) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <ArchivePeriodPicker range={RANGE} latest={LATEST} onChange={onChange} />
        </IntlProvider>,
    )

describe('ArchivePeriodPicker', () => {
    it('moves the end along when a typed start is more than 12 days before it', async () => {
        const onChange = jest.fn()
        await renderPicker(onChange)

        await fireEvent.changeText(screen.getByLabelText(en.archive.from), '2026091')

        expect(onChange).not.toHaveBeenCalled()
        expect(screen.getByLabelText(en.archive.from).props.value).toBe('2026-09-1')

        await fireEvent.changeText(screen.getByLabelText(en.archive.from), '20260910')

        expect(onChange).toHaveBeenCalledWith({ from: '2026-09-10', to: '2026-09-21' })
    })

    it('ignores a date that does not exist', async () => {
        const onChange = jest.fn()
        await renderPicker(onChange)

        await fireEvent.changeText(screen.getByLabelText(en.archive.to), '2026-02-31')

        expect(onChange).not.toHaveBeenCalled()
    })

    it('keeps a whole date outside 1940 to yesterday as typed instead of applying it', async () => {
        const onChange = jest.fn()
        await renderPicker(onChange)

        await fireEvent.changeText(screen.getByLabelText(en.archive.from), '19000505')

        expect(onChange).not.toHaveBeenCalled()
        expect(screen.getByLabelText(en.archive.from).props.value).toBe('1900-05-05')
    })

    it('moves an end a day with its buttons, never past yesterday', async () => {
        const onChange = jest.fn()
        await renderPicker(onChange)

        await fireEvent.press(screen.getByRole('button', { name: `${en.archive.from} −1` }))

        expect(onChange).toHaveBeenCalledWith({ from: '2026-10-04', to: '2026-10-11' })
        expect(screen.getByRole('button', { name: `${en.archive.to} +1` })).toBeDisabled()
    })

    it('states the limit', async () => {
        await renderPicker(jest.fn())

        expect(screen.getByText('Up to 12 days, from 1940 to yesterday.')).toBeOnTheScreen()
    })
})
