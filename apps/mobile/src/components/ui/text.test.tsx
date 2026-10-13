import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Text } from './text'

const getStyle = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style)

describe('Text', () => {
    it('names the Inter file of its weight and resets the weight, so Android draws the right face once', async () => {
        await render(<Text style={{ fontWeight: '600' }}>Semibold</Text>)

        expect(getStyle('Semibold')).toMatchObject({ fontFamily: 'Inter_600SemiBold', fontWeight: 'normal' })
    })

    it('uses the regular file without a weight', async () => {
        await render(<Text>Regular</Text>)

        expect(getStyle('Regular').fontFamily).toBe('Inter_400Regular')
    })
})
