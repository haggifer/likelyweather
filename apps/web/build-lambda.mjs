// Standalone output leaves the static assets out, so they are copied in. The zip is written here with explicit modes,
// because an archive made on Windows would lose the start script's execute bit.
import {
    cpSync,
    createWriteStream,
    existsSync,
    lstatSync,
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
} from 'node:fs'
import path from 'node:path'
import yazl from 'yazl'

const STANDALONE = '.next/standalone'
const REPO_ROOT = path.resolve(import.meta.dirname, '../..')
const APP_DIR = path.join(STANDALONE, 'apps/web')
const MTIME = new Date('2026-01-01T00:00:00Z')
const RUN_SH = '#!/bin/bash\nexec node apps/web/server.js\n'

const zip = new yazl.ZipFile()
let files = 0
let links = 0

// With pnpm, the standalone output's links point back to the repository's node_modules on Windows and to its own
// traced copy on Linux. Each link becomes a relative symlink entry to the traced copy inside the package, which keeps
// pnpm's layout (a package finds its dependencies next to itself) and ships only traced files: copied in place, a
// linked package would lose the dependencies beside it. Lambda unpacks symlinks from the zip.
const toTracedEntry = (file) => {
    const real = realpathSync(file)
    const standalone = realpathSync(STANDALONE)
    const traced = real.startsWith(standalone + path.sep) ? real : path.join(standalone, path.relative(REPO_ROOT, real))

    return existsSync(traced) ? path.relative(standalone, traced).split(path.sep).join('/') : null
}

// Follows symlinked directories; `seen` stops a cycle through them.
const addDir = (dir, prefix, seen) => {
    const real = realpathSync(dir)

    if (seen.has(real)) return

    const inner = new Set(seen).add(real)

    for (const name of readdirSync(dir)) {
        const file = path.join(dir, name)
        const entry = `${prefix}${name}`
        const isLink = lstatSync(file).isSymbolicLink()
        const tracedEntry = isLink ? toTracedEntry(file) : null

        if (tracedEntry) {
            const target = path.posix.relative(path.posix.dirname(entry), tracedEntry)

            zip.addBuffer(Buffer.from(target), entry, { mode: 0o120777, mtime: MTIME })
            links++
        } else if (statSync(file).isDirectory()) {
            addDir(file, `${entry}/`, inner)
        } else {
            zip.addBuffer(readFileSync(file), entry, { mode: 0o100644, mtime: MTIME })
            files++
        }
    }
}

cpSync('.next/static', path.join(APP_DIR, '.next/static'), { recursive: true })
cpSync('public', path.join(APP_DIR, 'public'), { recursive: true })

addDir(STANDALONE, '', new Set())
zip.addBuffer(Buffer.from(RUN_SH), 'run.sh', { mode: 0o100755, mtime: MTIME })
zip.outputStream.pipe(createWriteStream('.next/lambda.zip')).on('close', () => {
    const megabytes = (statSync('.next/lambda.zip').size / 1e6).toFixed(1)

    console.log(`.next/lambda.zip: ${files} files, ${links} links, ${megabytes} MB`)
})
zip.end()
