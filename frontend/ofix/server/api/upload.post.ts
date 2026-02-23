import { readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { createApiError } from '#server/utils/errors'
import { useUploadConfig } from '#server/utils/config'
import { isPdfMagic } from '#server/utils/validatePdf'
import { createJob } from '#server/services/jobs'
import { addPdfJob } from '#server/services/queue'
import { getOrCreateSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const config = useUploadConfig(event)

  // Cria ou recupera a sessao anonima do usuario antes de qualquer operacao.
  const sessionId = getOrCreateSession(event)

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createApiError(400, 'MISSING_FILE', 'Nenhum arquivo enviado.')
  }

  const fileField = form.find((f) => f.name === 'file' && f.data)
  if (!fileField || !fileField.data) {
    throw createApiError(400, 'MISSING_FILE', 'Nenhum arquivo enviado.')
  }

  if (fileField.data.length > config.maxUploadBytes) {
    throw createApiError(413, 'FILE_TOO_LARGE', 'Arquivo excede o tamanho maximo permitido.')
  }

  const buf = Buffer.from(fileField.data)
  if (!isPdfMagic(buf)) {
    throw createApiError(422, 'INVALID_FILE', 'O arquivo nao parece ser um PDF valido.')
  }

  const filename = `${uuidv4()}.pdf`
  const tempDir = config.tempDir
  await mkdir(tempDir, { recursive: true })
  const filePath = join(tempDir, filename)
  await writeFile(filePath, buf)

  const originalName = fileField.filename ?? 'documento.pdf'
  const jobId = createJob(filePath, originalName, sessionId)

  await addPdfJob(jobId, filePath)

  setResponseStatus(event, 201)
  return { jobId }
})
