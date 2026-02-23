import { v4 as uuidv4 } from 'uuid'
import { sanitizeFileName } from '#server/utils/sanitize'

export interface JobRecord {
  id: string
  sessionId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  pdfPath: string
  originalName: string
  ofxPath: string | null
  error: string | null
  createdAt: string
}

const jobs = new Map<string, JobRecord>()

export function createJob(
  pdfPath: string,
  originalName: string,
  sessionId: string,
): string {
  const id = uuidv4()
  jobs.set(id, {
    id,
    sessionId,
    status: 'pending',
    pdfPath,
    originalName: sanitizeFileName(originalName),
    ofxPath: null,
    error: null,
    createdAt: new Date().toISOString(),
  })
  return id
}

export function getJob(id: string): JobRecord | null {
  return jobs.get(id) ?? null
}

export function updateJobStatus(
  id: string,
  status: JobRecord['status'],
  ofxPath?: string | null,
  error?: string | null,
) {
  const job = jobs.get(id)
  if (job) {
    job.status = status
    if (ofxPath !== undefined) job.ofxPath = ofxPath
    if (error !== undefined) job.error = error
  }
}

/**
 * Retorna somente os jobs pertencentes à sessao informada.
 * Nunca expoe jobs de outras sessoes.
 */
export function listJobsBySession(sessionId: string): JobRecord[] {
  return Array.from(jobs.values()).filter((j) => j.sessionId === sessionId)
}

/**
 * @deprecated Use listJobsBySession para garantir isolamento por sessao.
 * Mantida apenas para uso interno (ex.: cleanup).
 */
export function listAllJobs(): JobRecord[] {
  return Array.from(jobs.values())
}
