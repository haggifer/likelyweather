const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const LAYOUTS_DIR = path.join(__dirname, 'widget-layouts')

const copyLayouts = (resDir) => {
    for (const folder of fs.readdirSync(LAYOUTS_DIR)) {
        const target = path.join(resDir, folder)

        fs.mkdirSync(target, { recursive: true })
        fs.cpSync(path.join(LAYOUTS_DIR, folder), target, { recursive: true })
    }
}

// The patched react-native-android-widget picks a widget's native layout by the widget's name, so each file in
// `widget-layouts/<res folder>/` is named `rn_widget_<widget name>.xml`.
const withWidgetLayouts = (config) =>
    withDangerousMod(config, [
        'android',
        (modConfig) => {
            copyLayouts(path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res'))

            return modConfig
        },
    ])

module.exports = withWidgetLayouts
