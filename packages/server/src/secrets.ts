import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm'

// On AWS a function only gets SSM_PREFIX; the database URL, the Redis URL and the met.no contact are SecureStrings
// under that path, read once per cold start. Call this before importing anything that reads process.env (env.ts
// parses it on import). Values already set win, as with the local .env.
export const loadSecrets = async () => {
    const prefix = process.env.SSM_PREFIX

    if (!prefix) return

    const ssm = new SSMClient({})
    let nextToken: string | undefined

    do {
        const page = await ssm.send(
            new GetParametersByPathCommand({ Path: prefix, WithDecryption: true, NextToken: nextToken }),
        )

        for (const { Name, Value } of page.Parameters ?? []) {
            if (Name && Value !== undefined) process.env[Name.slice(prefix.length).replace(/^\//, '')] ??= Value
        }

        nextToken = page.NextToken
    } while (nextToken)
}
