import { defineConfig, globalIgnores } from 'eslint/config'
import base from '../../eslint.base.mjs'

export default defineConfig([
    ...base,
    globalIgnores(['.expo/**', 'android/**', 'ios/**', 'expo-env.d.ts']),
    // Metro loads its config as CommonJS.
    { files: ['metro.config.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
])
