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
