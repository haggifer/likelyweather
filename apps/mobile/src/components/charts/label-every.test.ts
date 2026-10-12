import { getLabelEvery } from './label-every'

describe('getLabelEvery', () => {
    it('labels every slot that is two characters wide', () => {
        expect(getLabelEvery(20, 10)).toBe(1)
        expect(getLabelEvery(32, 10)).toBe(1)
    })

    it('thins the labels of narrower slots', () => {
        expect(getLabelEvery(12, 10)).toBe(2)
        expect(getLabelEvery(6, 10)).toBe(4)
    })
})
