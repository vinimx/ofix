import { readdir, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { useUploadConfig } from '#server/utils/config'

// Plugin de servidor: inicia um job periodico de limpeza de arquivos temporarios.
// Remove PDFs e OFXs com mais de cleanupAgeHours horas da pasta temp/.
// Executa a cada hora enquanto o processo Nitro estiver ativo.

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hora

async function cleanupTempFiles(tempDir: string, maxAgeHours: number) {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  const now = Date.now()

  let files: string[]
  try {
    files = await readdir(tempDir)
  } catch {
    return
  }

  for (const filename of files) {
    if (filename === '.gitkeep') continue

    const filePath = join(tempDir, filename)
    try {
      const info = await stat(filePath)
      const ageMs = now - info.mtimeMs
      if (ageMs > maxAgeMs) {
        await unlink(filePath)
        console.log(`[cleanup] Arquivo removido: ${filename} (${Math.round(ageMs / 3600000)}h)`)
      }
    } catch {
      // Arquivo ja pode ter sido removido por outro processo; ignorar
    }
  }
}

export default defineNitroPlugin(async (nitroApp) => {
  const config = useUploadConfig()
  const { tempDir, cleanupAgeHours } = config

  // Executa uma vez ao subir e depois a cada hora
  await cleanupTempFiles(tempDir, cleanupAgeHours).catch((err) =>
    console.error('[cleanup] Erro na limpeza inicial:', err)
  )

  const timer = setInterval(async () => {
    await cleanupTempFiles(tempDir, cleanupAgeHours).catch((err) =>
      console.error('[cleanup] Erro na limpeza periodica:', err)
    )
  }, CLEANUP_INTERVAL_MS)

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
  })
})
