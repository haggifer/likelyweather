import { getTimeTableDays, getTimeTableSlotLabels } from '@fa/chart-core/time-table'
import { render, screen } from '@testing-library/react-native'
import { TimeTable } from './TimeTable'

const STEPS = ['2026-10-12T18:00:00.000Z', '2026-10-12T21:00:00.000Z', '2026-10-13T00:00:00.000Z']
const ROWS = [
    { key: 'median', label: 'Median', isBold: true, cells: ['1.0', '2.0', '3.0'] },
    { key: 'gfs', label: 'GFS', cells: ['4.0', '5.0', '6.0'] },
]

const renderTable = () =>
    render(<TimeTable steps={STEPS} timeZone="UTC" locale="en" rows={ROWS} columnClassName="w-[4.5rem]" />)

describe('TimeTable', () => {
    it('heads each row with its label, in order', async () => {
        await renderTable()

        const heads = screen.getAllByRole('header').map((head) => head.props.children)

        expect(heads).toEqual(['Median', 'GFS'])
    })

    it('puts every slot in its own column with its time, and each row a cell per slot', async () => {
        await renderTable()

        getTimeTableSlotLabels(STEPS, 'UTC', 'en').forEach((time) => expect(screen.getByText(time)).toBeOnTheScreen())
        ROWS.flatMap((row) => row.cells).forEach((cell) => expect(screen.getByText(cell)).toBeOnTheScreen())
    })

    it('heads each local day with its date in both forms, named in full for screen readers', async () => {
        await renderTable()

        const days = getTimeTableDays(STEPS, 'UTC', 'en')

        expect(days.map(({ count }) => count)).toEqual([2, 1])
        days.forEach(({ label, shortLabel }) => {
            expect(screen.getByText(label)).toBeOnTheScreen()
            expect(screen.getByText(shortLabel)).toBeOnTheScreen()
            expect(screen.getByLabelText(label)).toBeOnTheScreen()
        })
    })
})
