import { handle, json } from '@/server/http'
import { MODELS } from '@fa/shared/models'

export const GET = handle('read', async () => json(MODELS))
