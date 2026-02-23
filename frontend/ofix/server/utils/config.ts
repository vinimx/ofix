// configurar as variaveis do upload

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