import en from '@fa/messages/catalogs/en.json'
import { Series } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { ComponentProps } from 'react'
import { IntlProvider } from 'use-intl'
import { ModelLegend } from './ModelLegend'

const SERIES: Series[] = [
    { modelId: ModelId.Gfs, values: [4] },
    { modelId: ModelId.EcmwfIfs, values: [6] },
    { modelId: ModelId.Metno, values: [5] },
]

const renderLegend = (props: Partial<ComponentProps<typeof ModelLegend>> = {}) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <ModelLegend
                series={SERIES}
                median={5}
                readoutIndex={0}
                readoutLabel="Fri 12:00"
                variable={Variable.Wind}
                hidden={[]}
                isMedianHidden={false}
                onToggleHidden={jest.fn()}
                onToggleMedian={jest.fn()}
                onReset={jest.fn()}
                {...props}
            />
        </IntlProvider>,
    )

describe('ModelLegend', () => {
    it('names the median wind direction next to the readout time', async () => {
        await renderLegend({ direction: 225 })

        expect(screen.getByText(/Wind from: SW 225°/)).toBeOnTheScreen()
    })

    it('leaves the direction out for other variables', async () => {
        await renderLegend({ variable: Variable.Temp })

        expect(screen.queryByText(/Wind from/)).toBeNull()
    })

    it('says whether the median is hidden', async () => {
        await renderLegend({ isMedianHidden: true })

        const eye = screen.getByRole('togglebutton', { name: en.legend.showMedian })

        expect(eye.props.accessibilityState).toMatchObject({ checked: true })
    })
})
