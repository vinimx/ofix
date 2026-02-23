import { listJobsBySession } from '#server/services/jobs'
import { getSessionId } from '#server/utils/session'

export default defineEventHandler((event) => {
  const sessionId = getSessionId(event)

  // Se nao ha sessao ativa, retorna lista vazia sem revelar nada.
  if (!sessionId) {
    return { jobs: [] }
  }

  const jobs = listJobsBySession(sessionId).map((j) => ({
    id: j.id,
    status: j.status,
    originalName: j.originalName,
    createdAt: j.createdAt,
    downloadAvailable: j.status === 'completed' && !!j.ofxPath,
  }))

  return { jobs }
})
