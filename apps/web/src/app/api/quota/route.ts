import { getClientIp, handle, json } from '@/server/http'
import { getQuota } from '@/server/quota'

export const GET = handle('read', async (req) => json(getQuota(getClientIp(req)), { cache: false }))
