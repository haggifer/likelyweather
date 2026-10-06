import { defineConfig, globalIgnores } from 'eslint/config'
import base from '../../eslint.base.mjs'

export default defineConfig([...base, globalIgnores(['.expo/**', 'android/**', 'ios/**', 'expo-env.d.ts'])])
