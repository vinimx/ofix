// criar um erro padrão para a API

import { createError } from 'h3'
export function createApiError(statusCode: number, code: string, message: string) {
  return createError({ statusCode, statusMessage: message, data: { code, message } })
}