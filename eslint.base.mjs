import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

// Base for every package and app except apps/web, which uses eslint-config-next.
export default defineConfig([
    ...tseslint.configs.recommended,
    reactHooks.configs.flat['recommended-latest'],
    globalIgnores(['dist/**', 'cdk.out/**', 'coverage/**', 'src/generated/**']),
])
