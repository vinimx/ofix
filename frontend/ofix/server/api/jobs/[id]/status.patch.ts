import { readBody, getRouterParam } from 'h3'
import { getJob, updateJobStatus } from '#server/services/jobs'
import { createApiError } from '#server/utils/errors'

interface StatusBody {
  status: 'processing' | 'completed' | 'failed'
  ofxPath?: string
  error?: string
}

export default defineEventHandler(async (event) => {
  // Autentica com segredo compartilhado entre worker e API
  const secret = useRuntimeConfig(event).workerSecret
  const authHeader = getRequestHeader(event, 'x-worker-secret')
  if (!authHeader || authHeader !== secret) {
    throw createApiError(401, 'UNAUTHORIZED', 'Acesso nao autorizado.')
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createApiError(400, 'BAD_REQUEST', 'ID ausente.')

  const job = getJob(id)
  if (!job) throw createApiError(404, 'NOT_FOUND', 'Job nao encontrado.')

  const body = await readBody<StatusBody>(event)
  const allowed = ['processing', 'completed', 'failed']
  if (!body?.status || !allowed.includes(body.status)) {
    throw createApiError(400, 'BAD_REQUEST', 'Status invalido.')
  }

  updateJobStatus(id, body.status, body.ofxPath ?? null, body.error ?? null)

  return { ok: true }
})
