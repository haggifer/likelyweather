import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Metro builds the app with the React Compiler, which gives each component a hook (`useMemoCache`), while
// react-native-android-widget calls widget components as plain functions outside React, so their file opts out. Jest
// doesn't run the compiler, so the test checks the opt-out itself: a directive counts only as the file's first
// statement, after nothing but comments.
describe('forecast-widget', () => {
    it('opts out of the React Compiler', () => {
        const source = readFileSync(join(__dirname, 'forecast-widget.tsx'), 'utf8')

        expect(source).toMatch(/^(\/\/.*\n)*'use no memo'\n/)
    })
})
