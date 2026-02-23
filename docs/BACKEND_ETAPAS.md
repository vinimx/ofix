# Backend: Etapas do Projeto (Nuxt / Nitro)

Este documento e um guia **etapa por etapa** para implementar o backend do sistema de conversao PDF para OFX **dentro do proprio projeto Nuxt**, usando o servidor Nitro (rotas em `server/`). Alinhado ao [PLANO_CONVERSAO_PDF_OFX.md](PLANO_CONVERSAO_PDF_OFX.md). Cada secao traz o que fazer, em que ordem e exemplos de codigo.

---

## Visao geral do backend no Nuxt

O backend fica no **mesmo projeto** do frontend (ex.: `frontend/ofix/`). O Nitro expoe:

- **Rotas de API** em `server/api/` (prefixo `/api` automatico)
- **Utilitarios** em `server/utils/`
- **Middleware** em `server/middleware/`
- **Plugins** em `server/plugins/`

Responsabilidades:

- Receber upload de PDF (multipart via `readMultipartFormData`)
- Validar e sanitizar o arquivo (tipo, tamanho, magic bytes, nome)
- Gravar em disco temporario com nome UUID
- Enfileirar job (BullMQ + Redis)
- **Worker em processo separado** que consome a fila e invoca o conversor Python
- Endpoints de listagem de jobs e download do OFX
- Health check e politicas de limpeza

**Stack:** Nuxt 4 (Nitro), h3 (defineEventHandler, readMultipartFormData, createError, sendStream), BullMQ, Redis. Sem Express.

---

## Etapa 1: Estrutura e dependencias no projeto Nuxt

### 1.1 Estrutura de pastas (dentro do projeto Nuxt)

Adicione ao projeto existente (ex.: `frontend/ofix/`):

```
frontend/ofix/
  app/                    # ja existe (pages, components)
  server/
    api/
      upload.post.ts      # POST /api/upload
      jobs/
        index.get.ts      # GET /api/jobs
        [id].get.ts       # GET /api/jobs/:id
        [id]/
          download.get.ts # GET /api/jobs/:id/download
      health.get.ts       # GET /api/health
    utils/                # validadores, sanitizacao, config
    services/             # jobs (Map/Redis), fila (BullMQ)
    middleware/           # opcional: rate limit, log
  temp/                   # arquivos temporarios (.gitignore)
  scripts/
    worker.ts             # processo separado: consome fila e chama Python
  nuxt.config.ts
  .env
  .env.example
```

O worker (`scripts/worker.ts`) roda em **processo separado** (ex.: `npx tsx scripts/worker.ts`), pois o Nitro atende apenas requisicoes HTTP.

### 1.2 Dependencias (package.json)

No `package.json` do projeto Nuxt, adicione:

```json
{
  "dependencies": {
    "nuxt": "^4.x",
    "bullmq": "^5.0.0",
    "ioredis": "^5.4.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  },
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "postinstall": "nuxt prepare",
    "worker": "tsx scripts/worker.ts"
  }
}
```

Nao e necessario Express nem multer: o Nitro/h3 trata multipart com `readMultipartFormData`.

### 1.3 Variaveis de ambiente e runtime config

No `nuxt.config.ts`, declare as variaveis que serao usadas no servidor:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/global.css'],
  runtimeConfig: {
    maxUploadMb: 20,
    redisUrl: 'redis://localhost:6379',
    tempDir: './temp',
    cleanupAgeHours: 24,
    pythonJobTimeoutMs: 300000,
    converterScriptPath: '',
  },
})
```

No `.env` (e documente no `.env.example`):

```env
NUXT_MAX_UPLOAD_MB=20
NUXT_REDIS_URL=redis://localhost:6379
NUXT_TEMP_DIR=./temp
NUXT_CLEANUP_AGE_HOURS=24
NUXT_PYTHON_JOB_TIMEOUT_MS=300000
NUXT_CONVERTER_SCRIPT_PATH=../../conversor-python/convert.py
```

No servidor, acesse com `useRuntimeConfig(event)`. As chaves em camelCase no config ficam em minusculo: `maxUploadMb` -> `runtimeConfig.maxUploadMb`.

### 1.4 Limite de tamanho do body (Nitro)

Para permitir uploads grandes (ex.: 20 MB), configure no `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/api/upload': { maxRequestBodyLength: 21 * 1024 * 1024 }, // 21 MB
    },
  },
})
```

Ajuste conforme `MAX_UPLOAD_MB`.

---

## Etapa 2: Configuracao e utilitarios do servidor

### 2.1 Configuracao derivada (server/utils/config.ts)

Crie `server/utils/config.ts` para expor valores derivados (ex.: tamanho maximo em bytes):

```ts
export function useUploadConfig(event?: any) {
  const config = useRuntimeConfig(event)
  const maxUploadMb = config.maxUploadMb ?? 20
  const maxUploadBytes = maxUploadMb * 1024 * 1024
  return {
    maxUploadBytes,
    tempDir: config.tempDir ?? './temp',
    redisUrl: config.redisUrl ?? 'redis://localhost:6379',
    cleanupAgeHours: config.cleanupAgeHours ?? 24,
    pythonJobTimeoutMs: config.pythonJobTimeoutMs ?? 300000,
    converterScriptPath: config.converterScriptPath as string,
  }
}
```

Use `useUploadConfig(event)` nos handlers que precisarem desses valores.

### 2.2 Resposta de erro padronizada

Em `server/utils/errors.ts`:

```ts
import { createError } from 'h3'

export function createApiError(statusCode: number, code: string, message: string) {
  return createError({ statusCode, statusMessage: message, data: { code, message } })
}
```

Nos handlers, use `throw createApiError(413, 'FILE_TOO_LARGE', 'Arquivo excede o tamanho maximo permitido.')` em vez de responder manualmente.

---

## Etapa 3: Validacao e sanitizacao

### 3.1 Magic bytes (PDF)

Em `server/utils/validatePdf.ts`:

```ts
const PDF_MAGIC = Buffer.from('%PDF', 'utf8')

export function isPdfMagic(buffer: Buffer | Uint8Array): boolean {
  if (!buffer || buffer.length < 4) return false
  return Buffer.from(buffer.subarray(0, 4)).equals(PDF_MAGIC)
}
```

Apos gravar o arquivo em disco (ou ler os primeiros bytes do multipart), chame `isPdfMagic(buf)` antes de aceitar.

### 3.2 Sanitizacao do nome do arquivo

Em `server/utils/sanitize.ts`:

```ts
export function sanitizeFileName(name: string | undefined): string {
  if (typeof name !== 'string') return 'documento.pdf'
  const basename = name.replace(/^.*[\\/]/, '')
  const safe = basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  return safe || 'documento.pdf'
}
```

Use apenas para **exibicao** e no nome do attachment do download. No disco, o arquivo deve ter nome UUID.

---

## Etapa 4: Servico de jobs e fila

### 4.1 Armazenamento de jobs (server/services/jobs.ts)

Para MVP, use um Map em memoria. Depois pode trocar por Redis ou banco.

```ts
import { v4 as uuidv4 } from 'uuid'
import { sanitizeFileName } from '#server/utils/sanitize'

export interface JobRecord {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  pdfPath: string
  originalName: string
  ofxPath: string | null
  error: string | null
  createdAt: string
}

const jobs = new Map<string, JobRecord>()

export function createJob(pdfPath: string, originalName: string): string {
  const id = uuidv4()
  jobs.set(id, {
    id,
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
  error?: string | null
) {
  const job = jobs.get(id)
  if (job) {
    job.status = status
    if (ofxPath !== undefined) job.ofxPath = ofxPath
    if (error !== undefined) job.error = error
  }
}

export function listJobs(): JobRecord[] {
  return Array.from(jobs.values())
}
```

Nao exponha `pdfPath` nem `ofxPath` nas respostas JSON; use apenas para leitura interna e download.

### 4.2 Fila BullMQ (server/services/queue.ts)

```ts
import { Queue } from 'bullmq'
import { useUploadConfig } from '#server/utils/config'

let queue: Queue | null = null

export function getQueue(): Queue {
  if (!queue) {
    const { redisUrl } = useUploadConfig()
    queue = new Queue('pdf-to-ofx', {
      connection: { url: redisUrl },
    })
  }
  return queue
}

export function addPdfJob(jobId: string, pdfPath: string) {
  return getQueue().add(
    'convert',
    { jobId, pdfPath },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600 },
    }
  )
}
```

O worker que consome a fila sera um script separado (Etapa 6).

---

## Etapa 5: Upload (POST /api/upload)

### 5.1 Gravar arquivo do multipart em disco

Use `readMultipartFormData` do h3. Leia o campo do arquivo, valide tamanho e magic bytes, grave com UUID.

Exemplo em `server/api/upload.post.ts`:

```ts
import { readMultipartFormData } from 'h3'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { createApiError } from '#server/utils/errors'
import { useUploadConfig } from '#server/utils/config'
import { isPdfMagic } from '#server/utils/validatePdf'
import { createJob } from '#server/services/jobs'
import { addPdfJob } from '#server/services/queue'

export default defineEventHandler(async (event) => {
  const config = useUploadConfig(event)
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

  const ext = (fileField.filename ?? '').toLowerCase().endsWith('.pdf') ? '.pdf' : '.pdf'
  const filename = `${uuidv4()}${ext}`
  const tempDir = config.tempDir
  const filePath = join(tempDir, filename)
  await writeFile(filePath, buf)

  const originalName = fileField.filename ?? 'documento.pdf'
  const jobId = createJob(filePath, originalName)
  await addPdfJob(jobId, filePath).catch((err) => {
    console.error('Queue add failed', err)
  })

  setResponseStatus(event, 201)
  return { jobId }
})
```

Garanta que o diretorio `tempDir` exista (crie no plugin ou no primeiro upload).

---

## Etapa 6: Worker (processo separado)

O Nitro so atende HTTP. O worker que consome a fila e chama o Python deve rodar em **outro processo**. Exemplo em `scripts/worker.ts` (ou `server/workers/queueWorker.ts` se preferir; a ideia e rodar com `npx tsx scripts/worker.ts`).

```ts
import { Worker } from 'bullmq'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { config } from 'dotenv'

config()

const redisUrl = process.env.NUXT_REDIS_URL ?? 'redis://localhost:6379'
const pythonTimeout = parseInt(process.env.NUXT_PYTHON_JOB_TIMEOUT_MS ?? '300000', 10)
const converterPath = process.env.NUXT_CONVERTER_SCRIPT_PATH ?? ''

// Importar servico de jobs: em processo separado nao temos acesso ao Map em memoria
// do Nuxt. Opcoes: (1) usar Redis para estado dos jobs; (2) chamar API interna para
// atualizar status. Para exemplo, assuma que jobs estao em Redis ou que o worker
// atualiza um store compartilhado (Redis). Aqui simplificado com console.

async function processPdfToOfx(job: { data: { jobId: string; pdfPath: string } }) {
  const { jobId, pdfPath } = job.data
  // TODO: marcar job como 'processing' (via Redis ou API)
  return new Promise<void>((resolve, reject) => {
    const child = spawn('python3', [converterPath, pdfPath], {
      timeout: pythonTimeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d })
    child.stderr?.on('data', (d) => { stderr += d })
    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const ofxPath = stdout.trim()
        // TODO: marcar job como 'completed' e salvar ofxPath (Redis ou API)
        resolve()
      } else {
        // TODO: marcar job como 'failed', error: stderr
        reject(new Error(stderr || `Exit ${code}`))
      }
    })
    child.on('error', (err) => reject(err))
  })
}

const worker = new Worker('pdf-to-ofx', processPdfToOfx, {
  connection: { url: redisUrl },
})
worker.on('failed', (j, err) => console.error('Job failed', j?.id, err.message))
console.log('Worker running')
```

**Importante:** Com o worker em processo separado, o Map em memoria usado na Etapa 4 **nao e compartilhado**. Para o worker atualizar o status dos jobs, use uma destas opcoes: (1) **Redis como store dos jobs** em vez do Map (chave `job:{id}` com JSON); (2) o worker chamar um endpoint interno da API para atualizar status (ex.: PATCH /api/jobs/:id/status). Recomenda-se Redis para producao.

---

## Etapa 7: Listagem, status e download

### 7.1 GET /api/jobs (server/api/jobs/index.get.ts)

```ts
import { listJobs } from '#server/services/jobs'

export default defineEventHandler((event) => {
  const jobs = listJobs().map((j) => ({
    id: j.id,
    status: j.status,
    originalName: j.originalName,
    createdAt: j.createdAt,
    downloadAvailable: j.status === 'completed' && !!j.ofxPath,
  }))
  return { jobs }
})
```

### 7.2 GET /api/jobs/[id] (server/api/jobs/[id].get.ts)

```ts
import { getJob } from '#server/services/jobs'
import { createApiError } from '#server/utils/errors'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createApiError(400, 'BAD_REQUEST', 'ID ausente.')
  const job = getJob(id)
  if (!job) throw createApiError(404, 'NOT_FOUND', 'Job nao encontrado.')
  return {
    id: job.id,
    status: job.status,
    originalName: job.originalName,
    createdAt: job.createdAt,
    downloadAvailable: job.status === 'completed' && !!job.ofxPath,
    error: job.status === 'failed' ? job.error : undefined,
  }
})
```

### 7.3 GET /api/jobs/[id]/download (server/api/jobs/[id]/download.get.ts)

Enviar o arquivo OFX como attachment; nunca expor o caminho real.

```ts
import { getJob } from '#server/services/jobs'
import { createApiError } from '#server/utils/errors'
import { createReadStream, existsSync } from 'node:fs'
import { sendStream } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createApiError(400, 'BAD_REQUEST', 'ID ausente.')
  const job = getJob(id)
  if (!job || job.status !== 'completed' || !job.ofxPath) {
    throw createApiError(404, 'NOT_FOUND', 'Arquivo nao encontrado.')
  }
  if (!existsSync(job.ofxPath)) {
    throw createApiError(410, 'GONE', 'Arquivo nao disponivel.')
  }
  const downloadName = job.originalName.replace(/\.pdf$/i, '.ofx') || 'extrato.ofx'
  setHeader(event, 'Content-Disposition', `attachment; filename="${downloadName}"`)
  return sendStream(event, createReadStream(job.ofxPath))
})
```

---

## Etapa 8: Health check e tratamento de erros

### 8.1 GET /api/health (server/api/health.get.ts)

Verificar conexao com Redis:

```ts
import Redis from 'ioredis'
import { useUploadConfig } from '#server/utils/config'

export default defineEventHandler(async (event) => {
  const config = useUploadConfig(event)
  const redis = new Redis(config.redisUrl)
  try {
    await redis.ping()
    redis.disconnect()
    return { status: 'ok', redis: 'connected', timestamp: new Date().toISOString() }
  } catch (e) {
    redis.disconnect().catch(() => {})
    setResponseStatus(event, 503)
    return { status: 'degraded', redis: 'disconnected' }
  }
})
```

### 8.2 Erros na API

Use sempre `throw createApiError(...)` para erros conhecidos. Erros nao tratados retornam 500; nao inclua stack nem caminhos na resposta. No `nuxt.config.ts` pode configurar um handler global de erro se quiser padronizar o JSON (code/message).

---

## Etapa 9: Limpeza e rate limiting

### 9.1 Limpeza de arquivos antigos

Crie um cron ou job agendado (fora do Nuxt, ou via `setInterval` em um server plugin) que:

- Liste arquivos em `TEMP_DIR` e jobs em memoria (ou Redis).
- Remova arquivos com mais de `cleanupAgeHours` e atualize/remova registros.

Em Nuxt, um **server plugin** pode iniciar um setInterval ao subir o processo (apenas em modo servidor, nao em serverless sem estado persistente).

### 9.2 Rate limiting

Use middleware em `server/middleware/rate-limit.ts` com um store em memoria (ou Redis) por IP: limite de requisicoes por minuto em `/api/upload`. Em caso de excesso, lance `createApiError(429, 'TOO_MANY_REQUESTS', 'Muitas requisicoes. Tente novamente em instantes.')`.

---

## Etapa 10: Testes (backend no Nuxt)

- Testes unitarios: `isPdfMagic`, `sanitizeFileName`, validacao de tamanho (em funcoes isoladas em `server/utils/`).
- Testes de integracao: chamar `$fetch('/api/upload', { method: 'POST', body: formData })` com arquivo valido; `$fetch('/api/jobs')` e `$fetch('/api/jobs/:id')`; download com job completed. Mockar Redis e o conversor Python quando necessario. Use `createNuxtTestContext` ou testes e2e contra o servidor rodando.

---

## Ordem sugerida de implementacao

| Ordem | Etapa | Entregavel |
|-------|--------|------------|
| 1 | Estrutura server/, nuxt.config (runtimeConfig, nitro), .env.example | Config e rotas vazias |
| 2 | server/utils/config, errors, validatePdf, sanitize | Validacao e erros |
| 3 | server/services/jobs (Map), queue (BullMQ), POST /api/upload | Upload e fila |
| 4 | scripts/worker.ts (consumir fila, spawn Python) | Conversao assincrona |
| 5 | GET /api/jobs, GET /api/jobs/[id], GET /api/jobs/[id]/download | Listagem e download |
| 6 | GET /api/health, refinamento de erros | Resiliencia |
| 7 | Limpeza agendada, rate limiting (middleware) | Producao-ready |
| 8 | Testes unitarios e de integracao | Cobertura |

---

## Referencias

- Plano geral: [docs/PLANO_CONVERSAO_PDF_OFX.md](PLANO_CONVERSAO_PDF_OFX.md)
- Fluxo e contrato da API: [docs/etapa-04-fluxo-dados-comunicacao.md](etapa-04-fluxo-dados-comunicacao.md)
- Seguranca: [docs/etapa-05-seguranca.md](etapa-05-seguranca.md)
- Nuxt Server: https://nuxt.com/docs/4.x/guide/directory-structure/server
- h3 utilities: https://h3.unjs.io/
