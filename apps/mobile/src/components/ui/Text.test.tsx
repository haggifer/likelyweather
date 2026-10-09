import { render, screen } from '@testing-library/react-native'
import { Text } from './Text'

describe('Text', () => {
    it('sets the Inter file of the requested weight and tabular figures', async () => {
        await render(<Text style={{ fontWeight: '600' }}>21.9</Text>)

        expect(screen.getByText('21.9')).toHaveStyle({
            fontFamily: 'Inter_600SemiBold',
            fontWeight: 'normal',
            fontVariant: ['tabular-nums'],
        })
    })

    it('falls back to the regular file without a weight', async () => {
        await render(<Text>Kyiv</Text>)

        expect(screen.getByText('Kyiv')).toHaveStyle({ fontFamily: 'Inter_400Regular' })
    })
})
