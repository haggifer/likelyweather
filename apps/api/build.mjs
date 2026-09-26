// Bundles the API into one ESM file for `pnpm start`, and packages it for Lambda with the Web Adapter's start script.
import { build } from 'esbuild'
import { createWriteStream, writeFileSync } from 'node:fs'
import yazl from 'yazl'

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

// The Lambda handler is this script, run by the Web Adapter; it must be executable, and a zip made on Windows loses
// the bit, so the archive is written here with explicit modes.
const RUN_SH = '#!/bin/bash\nexec node server.mjs\n'
writeFileSync('dist/run.sh', RUN_SH)

const zip = new yazl.ZipFile()
const MTIME = new Date('2026-01-01T00:00:00Z')
zip.addBuffer(Buffer.from(RUN_SH), 'run.sh', { mode: 0o100755, mtime: MTIME })
zip.addFile('dist/server.mjs', 'server.mjs', { mode: 0o100644, mtime: MTIME })
zip.addFile('dist/server.mjs.map', 'server.mjs.map', { mode: 0o100644, mtime: MTIME })
zip.outputStream.pipe(createWriteStream('dist/lambda.zip'))
zip.end()
