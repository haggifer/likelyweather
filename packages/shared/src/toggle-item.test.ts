import { toggleItem } from './toggle-item'

describe('toggleItem', () => {
    it('adds a missing item at the end and removes a present one', () => {
        expect(toggleItem(['a'], 'b')).toEqual(['a', 'b'])
        expect(toggleItem(['a', 'b'], 'a')).toEqual(['b'])
    })
})
