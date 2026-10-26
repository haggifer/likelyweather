// Uniwind's wrapper must stay the outermost one if another Metro wrapper is added.
const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

module.exports = withUniwindConfig(getDefaultConfig(__dirname), {
    cssEntryFile: './src/global.css',
    dtsFile: './src/uniwind-types.d.ts',
})
