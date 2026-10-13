import { fireEvent, render, screen } from '@testing-library/react-native'
import { Button } from './Button'

describe('Button', () => {
    it('calls onPress when enabled', async () => {
        const onPress = jest.fn()

        await render(<Button label="Refresh" onPress={onPress} />)
        await fireEvent.press(screen.getByRole('button', { name: 'Refresh' }))

        expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('stays disabled for assistive technology but passes the tap to onDisabledPress', async () => {
        const onPress = jest.fn()
        const onDisabledPress = jest.fn()

        await render(<Button label="Refresh" onPress={onPress} isDisabled onDisabledPress={onDisabledPress} />)

        const button = screen.getByRole('button', { name: 'Refresh' })

        await fireEvent.press(button)

        expect(button).toBeDisabled()
        expect(onDisabledPress).toHaveBeenCalledTimes(1)
        expect(onPress).not.toHaveBeenCalled()
    })

    it('ignores taps while disabled without onDisabledPress', async () => {
        const onPress = jest.fn()

        await render(<Button label="Refresh" onPress={onPress} isDisabled />)
        await fireEvent.press(screen.getByRole('button', { name: 'Refresh' }))

        expect(onPress).not.toHaveBeenCalled()
    })
})
