import { getRequestIP, createError } from 'h3'

// Limitacao de requisicoes por IP para o endpoint de upload.
// Estrutura: Map<ip, { count: number; windowStart: number }>
// Janela de 60 segundos com limite de 10 requisicoes por IP.

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

interface RateEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateEntry>()

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? ''

  if (!url.startsWith('/api/upload')) return

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now })
    return
  }

  entry.count += 1

  if (entry.count > MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas requisicoes. Tente novamente em instantes.',
      data: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisicoes. Tente novamente em instantes.' },
    })
  }
})
