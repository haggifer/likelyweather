import { dismissSnackbar, getSnackbar, showSnackbar, subscribeSnackbar } from './snackbar-store'

describe('snackbar store', () => {
    beforeEach(() => jest.useFakeTimers())

    afterEach(() => {
        dismissSnackbar()
        jest.useRealTimers()
    })

    it('shows a message and closes it after four seconds', () => {
        const onChange = jest.fn()
        const unsubscribe = subscribeSnackbar(onChange)

        showSnackbar('Up to date')

        expect(getSnackbar()?.message).toBe('Up to date')

        jest.advanceTimersByTime(3999)

        expect(getSnackbar()).not.toBeNull()

        jest.advanceTimersByTime(1)

        expect(getSnackbar()).toBeNull()
        expect(onChange).toHaveBeenCalledTimes(2)

        unsubscribe()
    })

    it('keeps a message with actions for six seconds and at most two actions', () => {
        const action = { label: 'Use it', onPress: jest.fn() }

        showSnackbar('Far away', [action, action, action])

        expect(getSnackbar()?.actions).toHaveLength(2)

        jest.advanceTimersByTime(5999)

        expect(getSnackbar()).not.toBeNull()

        jest.advanceTimersByTime(1)

        expect(getSnackbar()).toBeNull()
    })

    it('replaces the message on screen, and the old timer never closes the new one', () => {
        showSnackbar('First')
        jest.advanceTimersByTime(3000)

        const id = showSnackbar('Second')

        jest.advanceTimersByTime(1500)

        expect(getSnackbar()?.message).toBe('Second')

        dismissSnackbar(id - 1)

        expect(getSnackbar()?.id).toBe(id)

        dismissSnackbar(id)

        expect(getSnackbar()).toBeNull()
    })
})
