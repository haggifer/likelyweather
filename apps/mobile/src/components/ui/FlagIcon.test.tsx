import { render, screen } from '@testing-library/react-native'
import { FlagIcon } from './FlagIcon'

describe('FlagIcon', () => {
    it('draws the country flag at 3:2 with its frame outside it, hidden from screen readers', async () => {
        await render(<FlagIcon countryCode="ua" width={24} />)

        const flag = screen.getByTestId('flag-UA', { includeHiddenElements: true })

        // A 1 px frame around the 24 x 16 artwork, taking no room in the layout.
        expect(flag).toHaveStyle({ width: 26, height: 18, margin: -1 })
        expect(screen.queryByTestId('flag-UA')).toBeNull()
    })

    it('draws nothing for a code the flag set lacks', async () => {
        await render(<FlagIcon countryCode="ZZ" />)

        expect(screen.queryByTestId('flag-ZZ', { includeHiddenElements: true })).toBeNull()
    })
})
