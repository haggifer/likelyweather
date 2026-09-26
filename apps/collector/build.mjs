// Bundles the Lambda handler into one ESM file.
import { build } from 'esbuild'

await build({
    entryPoints: ['src/handler.ts'],
    outfile: 'dist/handler.mjs',
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: true,
    // CommonJS dependencies (pg, ioredis) need `require` inside an ES module bundle.
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'info',
})
