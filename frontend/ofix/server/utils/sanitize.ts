// sanitizar o nome do arquivo para evitar path traversal e caracteres especiais

export function sanitizeFileName(name: string | undefined): string {
    if (typeof name !== 'string') return 'documento.pdf'
    const basename = name.replace(/^.*[\\/]/, '')
    const safe = basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
    return safe || 'documento.pdf'
}