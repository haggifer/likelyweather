// Raw upstream responses of one run, kept as a single JSON document: in RAW_DIR locally, in the S3 bucket on AWS.
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Run } from '@fa/shared/api'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { env } from './env'

export interface RunArchive {
    run: Run
    files: Record<string, unknown>
}

const PRESIGN_SECONDS = 600

let s3: S3Client | undefined

const getS3 = () => (s3 ??= new S3Client({ region: env.AWS_REGION }))

const toKey = (runId: string) => `runs/${runId}.json`

export const writeRunArchive = async (archive: RunArchive) => {
    const body = JSON.stringify(archive)

    if (env.RAW_BUCKET) {
        const key = toKey(archive.run.id)

        await getS3().send(
            new PutObjectCommand({ Bucket: env.RAW_BUCKET, Key: key, Body: body, ContentType: 'application/json' }),
        )

        return key
    }

    const file = path.join(env.RAW_DIR, `${archive.run.id}.json`)

    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, body)

    return path.relative(env.RAW_DIR, file)
}

// Where the archive can be read: a presigned S3 URL on AWS, or the document itself locally.
export const getRunArchive = async (runId: string): Promise<{ url: string } | { body: string } | null> => {
    if (env.RAW_BUCKET) {
        const command = new GetObjectCommand({ Bucket: env.RAW_BUCKET, Key: toKey(runId) })
        const url = await getSignedUrl(getS3(), command, { expiresIn: PRESIGN_SECONDS })

        return { url }
    }

    const body = await fs.readFile(path.join(env.RAW_DIR, `${runId}.json`), 'utf8').catch(() => null)

    return body === null ? null : { body }
}
