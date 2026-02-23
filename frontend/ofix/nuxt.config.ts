// https://nuxt.com/docs/api/configuration/nuxt-config
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
    workerSecret: 'dev-worker-secret-change-in-prod',
  },
  nitro: {
    routeRules: {
      '/api/upload': { maxRequestBodyLength: 21 * 1024 * 1024 }, // 21 MB
    },
    externals: {
      external: ['uuid', 'bullmq', 'ioredis'],
    },
    rollupConfig: {
      external: ['uuid', 'bullmq', 'ioredis'],
    },
  },
})
