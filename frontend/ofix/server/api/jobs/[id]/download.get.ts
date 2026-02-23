import { getJob } from '#server/services/jobs'
import { createApiError } from '#server/utils/errors'
import { getSessionId } from '#server/utils/session'
import { createReadStream, existsSync } from 'node:fs'
import { sendStream } from 'h3'

export default defineEventHandler(async (event) => {
  const sessionId = getSessionId(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createApiError(400, 'BAD_REQUEST', 'ID ausente.')

  const job = getJob(id)

  // Retorna 404 para jobs inexistentes OU de outra sessao, sem revelar que o recurso existe.
  if (!job || !sessionId || job.sessionId !== sessionId) {
    throw createApiError(404, 'NOT_FOUND', 'Arquivo nao encontrado.')
  }

  if (job.status !== 'completed' || !job.ofxPath) {
    throw createApiError(404, 'NOT_FOUND', 'Arquivo nao encontrado.')
  }

  if (!existsSync(job.ofxPath)) {
    throw createApiError(410, 'GONE', 'Arquivo nao disponivel.')
  }

  const downloadName = job.originalName.replace(/\.pdf$/i, '.ofx') || 'extrato.ofx'
  setHeader(event, 'Content-Disposition', `attachment; filename="${downloadName}"`)
  return sendStream(event, createReadStream(job.ofxPath))
})
