import en from '@fa/messages/catalogs/en.json'
import { MODELS } from '@fa/shared/models'
import { DISAGREEMENT_VARIABLES } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { MethodologyScreen } from './MethodologyScreen'

describe('MethodologyScreen', () => {
    it('shows the methodology sections and every model from the shared catalog and palette', async () => {
        await render(
            <IntlProvider locale="en" messages={en}>
                <MethodologyScreen />
            </IntlProvider>,
        )

        expect(screen.getByText(en.methodology.title)).toBeOnTheScreen()
        expect(screen.getByText(en.methodology.sources.title)).toBeOnTheScreen()
        expect(screen.getByText(MODELS[0].name)).toBeOnTheScreen()
        expect(screen.getAllByRole('listitem')).toHaveLength(MODELS.length + DISAGREEMENT_VARIABLES.length)
    })
})
