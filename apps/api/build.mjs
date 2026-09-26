// Bundles the API into one ESM file for Lambda (run by the Web Adapter) and for `pnpm start`.
import { build } from 'esbuild'

await build({
    entryPoints: ['src/server.ts'],
    outfile: 'dist/server.mjs',
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: true,
    // CommonJS dependencies (express, pg) need `require` inside an ES module bundle.
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'info',
})
