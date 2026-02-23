// validar se o arquivo é um PDF válido

import { Buffer } from 'buffer'

const PDF_MAGIC = Buffer.from('%PDF', 'utf8')

export function isPdfMagic(buffer: Buffer | Uint8Array): boolean {
    if (!buffer || buffer.length < 4) return false
    return Buffer.from(buffer.subarray(0, 4)).equals(PDF_MAGIC)
}