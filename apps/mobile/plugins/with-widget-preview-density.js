const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

// react-native-android-widget copies each widget's `previewImage` into `res/drawable`, which Android reads as mdpi
// and scales by the screen's density: a preview drawn for a 3× screen would be decoded three times larger, and one
// drawn at 1× would be blurred. `drawable-nodpi` keeps it at its own size. Expo runs the file steps of later plugins
// first, so this plugin is listed before the library's in app.json, to run after it has copied the images.
const withWidgetPreviewDensity = (config) =>
    withDangerousMod(config, [
        'android',
        (modConfig) => {
            const res = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res')
            const previews = fs.readdirSync(path.join(res, 'drawable')).filter((file) => file.includes('_preview.'))

            if (previews.length === 0) {
                throw new Error(
                    'No widget preview in res/drawable: list this plugin before react-native-android-widget',
                )
            }

            fs.mkdirSync(path.join(res, 'drawable-nodpi'), { recursive: true })

            for (const file of previews) {
                fs.renameSync(path.join(res, 'drawable', file), path.join(res, 'drawable-nodpi', file))
            }

            return modConfig
        },
    ])

module.exports = withWidgetPreviewDensity
