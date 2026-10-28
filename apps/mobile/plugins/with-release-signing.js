const { withAppBuildGradle } = require('expo/config-plugins')

// A release build is signed with the release key when the machine names it in its Gradle properties (for example
// ~/.gradle/gradle.properties), and with the template's debug key otherwise, so any collaborator can still build.
// Android installs an update only over an app signed with the same key, so every APK given out must come from one key.
const STORE_FILE = 'LIKELYWEATHER_RELEASE_STORE_FILE'

const RELEASE_SIGNING = `
        release {
            if (findProperty('${STORE_FILE}')) {
                storeFile file(findProperty('${STORE_FILE}'))
                storePassword findProperty('LIKELYWEATHER_RELEASE_STORE_PASSWORD')
                keyAlias findProperty('LIKELYWEATHER_RELEASE_KEY_ALIAS')
                keyPassword findProperty('LIKELYWEATHER_RELEASE_KEY_PASSWORD')
            }
        }`

const DEBUG_SIGNING_END = "keyPassword 'android'\n        }"
const RELEASE_USES_DEBUG = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/

const withReleaseSigning = (config) =>
    withAppBuildGradle(config, (modConfig) => {
        const gradle = modConfig.modResults.contents

        if (!gradle.includes(DEBUG_SIGNING_END) || !RELEASE_USES_DEBUG.test(gradle)) {
            throw new Error("android/app/build.gradle no longer matches Expo's template: update with-release-signing")
        }

        modConfig.modResults.contents = gradle
            .replace(DEBUG_SIGNING_END, `${DEBUG_SIGNING_END}${RELEASE_SIGNING}`)
            .replace(
                RELEASE_USES_DEBUG,
                `$1signingConfig findProperty('${STORE_FILE}') ? signingConfigs.release : signingConfigs.debug`,
            )

        return modConfig
    })

module.exports = withReleaseSigning
