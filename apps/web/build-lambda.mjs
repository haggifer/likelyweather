// Packages the standalone Next.js server for Lambda behind the Web Adapter: static assets copied in (standalone
// output leaves them out), pnpm's symlinks kept as relative links, and an executable start script. The zip is
// written here with explicit modes, because an archive made on Windows would lose the script's execute bit.
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

cpSync('.next/static', path.join(APP_DIR, '.next/static'), { recursive: true })
cpSync('public', path.join(APP_DIR, 'public'), { recursive: true })

const zip = new yazl.ZipFile()
let files = 0
let links = 0

// With pnpm, the standalone output links back to the repository's node_modules (absolutely, on Windows) instead of
// to its own traced copy. Each link becomes a relative symlink entry to the traced copy inside the package, which
// keeps pnpm's layout (a package finds its dependencies next to itself) and ships only traced files. Lambda unpacks
// symlinks from the zip.
const toTracedEntry = (file) => {
    const traced = path.join(STANDALONE, path.relative(REPO_ROOT, realpathSync(file)))

    return existsSync(traced) ? path.relative(STANDALONE, traced).split(path.sep).join('/') : null
}

// Adds `dir` under `prefix`, following symlinks; `seen` stops cycles through linked directories.
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

addDir(STANDALONE, '', new Set())
zip.addBuffer(Buffer.from(RUN_SH), 'run.sh', { mode: 0o100755, mtime: MTIME })
zip.outputStream.pipe(createWriteStream('.next/lambda.zip')).on('close', () => {
    console.log(
        `.next/lambda.zip: ${files} files, ${links} links, ${(statSync('.next/lambda.zip').size / 1e6).toFixed(1)} MB`,
    )
})
zip.end()
