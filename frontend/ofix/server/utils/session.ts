import { getCookie, setCookie } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import type { H3Event } from 'h3'

const SESSION_COOKIE = 'ofix_session'

// Sessao valida por 7 dias. O usuario pode acompanhar seus uploads dentro desse periodo.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/**
 * Retorna o sessionId existente do cookie ou cria um novo, fixando o cookie na resposta.
 * O cookie é HttpOnly (inacessível via JS) e SameSite=Lax para proteção básica contra CSRF.
 */
export function getOrCreateSession(event: H3Event): string {
  let sessionId = getCookie(event, SESSION_COOKIE)

  if (!sessionId) {
    sessionId = uuidv4()
    setCookie(event, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  return sessionId
}

/**
 * Lê o sessionId do cookie sem criar um novo.
 * Retorna undefined se o usuario nao possui sessao ativa.
 */
export function getSessionId(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE) ?? undefined
}
