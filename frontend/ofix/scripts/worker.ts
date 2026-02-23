import { Worker } from 'bullmq'
import { spawn } from 'node:child_process'
import { config } from 'dotenv'

config()

const redisUrl = process.env.NUXT_REDIS_URL ?? 'redis://localhost:6379'
const pythonTimeout = parseInt(process.env.NUXT_PYTHON_JOB_TIMEOUT_MS ?? '300000', 10)
const converterPath = process.env.NUXT_CONVERTER_SCRIPT_PATH ?? './conversor-python/convert.py'
const workerSecret = process.env.NUXT_WORKER_SECRET ?? 'dev-worker-secret-change-in-prod'
const apiUrl = process.env.NUXT_API_URL ?? 'http://localhost:3000'

// Determina o executavel Python (python3 em Linux/Mac, python no Windows)
const pythonBin = process.platform === 'win32' ? 'python' : 'python3'

async function updateJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  ofxPath?: string,
  error?: string
) {
  try {
    const res = await fetch(`${apiUrl}/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({ status, ofxPath, error }),
    })
    if (!res.ok) {
      console.warn(`[worker] Falha ao atualizar status do job ${jobId}: ${res.status}`)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[worker] Erro ao chamar API de status para job ${jobId}:`, message)
  }
}

async function processPdfToOfx(job: { data: { jobId: string; pdfPath: string } }) {
  const { jobId, pdfPath } = job.data

  console.log(`[worker] Iniciando conversao do job ${jobId}: ${pdfPath}`)
  await updateJobStatus(jobId, 'processing')

  return new Promise<void>((resolve, reject) => {
    const child = spawn(pythonBin, [converterPath, pdfPath], {
      timeout: pythonTimeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })

    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })

    child.on('close', async (code) => {
      if (code === 0 && stdout.trim()) {
        const ofxPath = stdout.trim()
        console.log(`[worker] Job ${jobId} concluido. OFX: ${ofxPath}`)
        await updateJobStatus(jobId, 'completed', ofxPath)
        resolve()
      } else {
        const errorMsg = stderr.trim() || `Processo encerrado com codigo ${code}`
        console.error(`[worker] Job ${jobId} falhou. Stderr: ${errorMsg}`)
        await updateJobStatus(jobId, 'failed', undefined, errorMsg)
        reject(new Error(errorMsg))
      }
    })

    child.on('error', async (err) => {
      console.error(`[worker] Erro ao iniciar processo Python para job ${jobId}:`, err.message)
      await updateJobStatus(jobId, 'failed', undefined, err.message)
      reject(err)
    })
  })
}

const worker = new Worker('pdf-to-ofx', processPdfToOfx, {
  connection: { url: redisUrl },
})

worker.on('failed', (j, err) => {
  console.error(`[worker] Job falhou: ${j?.id}`, err.message)
})

worker.on('error', (err) => {
  console.error('[worker] Erro no worker:', err.message)
})

console.log('[worker] Worker rodando e aguardando jobs na fila "pdf-to-ofx"...')
