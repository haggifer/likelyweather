import { fireEvent, render, screen } from '@testing-library/react-native'
import { SnackbarToast } from './SnackbarToast'

describe('SnackbarToast', () => {
    it('shows the message and hands a pressed action back', async () => {
        const onAction = jest.fn()
        const action = { label: 'Use it', onPress: jest.fn() }

        await render(<SnackbarToast message="Far away" actions={[action]} onAction={onAction} />)

        expect(screen.getByText('Far away')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: 'Use it' }))

        expect(onAction).toHaveBeenCalledWith(action)
    })
})
