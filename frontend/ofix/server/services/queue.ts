import { Queue } from 'bullmq'
import { useUploadConfig } from '#server/utils/config'

// A instancia da fila e criada de forma lazy na primeira chamada a getQueue().
// Se o Redis nao estiver disponivel, addPdfJob falha de forma silenciosa (catch no caller).
let queue: Queue | null = null

export function getQueue(): Queue {
  if (!queue) {
    const { redisUrl } = useUploadConfig()
    queue = new Queue('pdf-to-ofx', {
      connection: {
        url: redisUrl,
        // Limita as tentativas de reconexao para evitar flood de erros no log em dev
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 3) return null
          return Math.min(times * 1000, 3000)
        },
      },
    })

    queue.on('error', (err) => {
      console.warn('[queue] Redis indisponivel:', err.message)
      // Reseta a instancia para que a proxima chamada tente reconectar
      queue = null
    })
  }
  return queue
}

export async function addPdfJob(jobId: string, pdfPath: string): Promise<void> {
  try {
    await getQueue().add(
      'convert',
      { jobId, pdfPath },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[queue] Falha ao enfileirar job:', message)
  }
}
