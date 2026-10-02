import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
    it('reads the message of an Error and stringifies anything else', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom')
        expect(getErrorMessage('plain')).toBe('plain')
        expect(getErrorMessage(42)).toBe('42')
    })
})
