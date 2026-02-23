import { getJob } from '#server/services/jobs'
import { createApiError } from '#server/utils/errors'
import { getSessionId } from '#server/utils/session'

export default defineEventHandler((event) => {
  const sessionId = getSessionId(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createApiError(400, 'BAD_REQUEST', 'ID ausente.')

  const job = getJob(id)

  // Retorna 404 independente de o job existir ou pertencer a outra sessao,
  // para nao vazar informacao sobre jobs de outros usuarios.
  if (!job || !sessionId || job.sessionId !== sessionId) {
    throw createApiError(404, 'NOT_FOUND', 'Job nao encontrado.')
  }

  return {
    id: job.id,
    status: job.status,
    originalName: job.originalName,
    createdAt: job.createdAt,
    downloadAvailable: job.status === 'completed' && !!job.ofxPath,
    error: job.status === 'failed' ? job.error : undefined,
  }
})
