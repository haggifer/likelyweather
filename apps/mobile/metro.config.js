// Uniwind compiles src/global.css (generated from the web's tokens) into native styles; it must wrap the config last.
const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

module.exports = withUniwindConfig(getDefaultConfig(__dirname), {
    cssEntryFile: './src/global.css',
    dtsFile: './src/uniwind-types.d.ts',
})
