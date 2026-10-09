import { getSelectedCity, setSelectedCity, subscribeSelectedCity } from './selected-city-store'

describe('selected city store', () => {
    it('starts empty, keeps the latest city and tells subscribers only about changes', () => {
        const onChange = jest.fn()
        const unsubscribe = subscribeSelectedCity(onChange)

        expect(getSelectedCity()).toBeNull()

        setSelectedCity('kyiv-ua-703448')
        setSelectedCity('kyiv-ua-703448')
        setSelectedCity('paris-fr-2988507')

        expect(getSelectedCity()).toBe('paris-fr-2988507')
        expect(onChange).toHaveBeenCalledTimes(2)

        unsubscribe()
        setSelectedCity('london-gb-2643743')

        expect(onChange).toHaveBeenCalledTimes(2)
    })
})
