import type { SessionUser, UserRole } from './types'

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production'

export const SESSION_COOKIE_NAME = 'session'

export async function parseSessionCookieEdge(cookieValue: string): Promise<SessionUser | null> {
  try {
    const [encoded, sig] = cookieValue.split('.')
    if (!encoded || !sig) return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded))
    const expectedSig = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    if (expectedSig !== sig) return null

    const data = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
    if (data.exp && data.exp < Date.now()) return null

    return {
      id: data.userId,
      email: data.email,
      nome_completo: data.nome_completo,
      role: data.role as UserRole,
    }
  } catch {
    return null
  }
}
