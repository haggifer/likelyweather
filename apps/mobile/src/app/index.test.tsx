import { render, screen } from '@testing-library/react-native'
import HomeScreen from './index'

describe('HomeScreen', () => {
    it('shows the app name', async () => {
        await render(<HomeScreen />)

        expect(screen.getByText('Forecast Arena')).toBeOnTheScreen()
    })
})
