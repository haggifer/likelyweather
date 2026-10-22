import { defineConfig, globalIgnores } from 'eslint/config'
import base from '../../eslint.base.mjs'

export default defineConfig([
    ...base,
    globalIgnores(['.expo/**', 'android/**', 'ios/**', 'expo-env.d.ts']),
    // Metro and Expo's config plugins load as CommonJS.
    { files: ['metro.config.js', 'plugins/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
])
