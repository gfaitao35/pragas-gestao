import { createHmac, randomBytes } from 'crypto'
import { sql } from './db'
import type { UserRole } from './types'
import type { SessionUser } from './types'

const SESSION_COOKIE = 'session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

function sign(value: string): string {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex')
}

export function createSessionCookie(payload: { userId: string; email: string; nome_completo: string; role: string }): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  })
  const encoded = Buffer.from(data, 'utf-8').toString('base64url')
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function parseSessionCookie(cookieValue: string): SessionUser | null {
  try {
    const [encoded, sig] = cookieValue.split('.')
    if (!encoded || !sig || sig !== sign(encoded)) return null
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
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

export async function getSessionFromCookie(cookieHeader: string | undefined): Promise<SessionUser | null> {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  const value = match?.[1]?.trim()
  if (!value) return null
  return parseSessionCookie(value)
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  }
}

export async function hashPassword(password: string): Promise<string> {
  const { scrypt, randomBytes } = await import('crypto')
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err)
      else resolve(`${salt}:${derived.toString('hex')}`)
    })
  })
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const { scrypt } = await import('crypto')
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  return new Promise((resolve) => {
    scrypt(password, salt, 64, (err, derived) => {
      if (err) { resolve(false); return }
      resolve(derived.toString('hex') === hash)
    })
  })
}

export function generateId(): string {
  return randomBytes(16).toString('hex')
}

// ── Agora todas as funções de banco são async ──

export async function getUserByEmail(email: string): Promise<
  { id: string; email: string; senha: string; nome_completo: string; role: string } | null
> {
  const rows = await sql`
    SELECT id, email, senha, nome_completo, role FROM users WHERE email = ${email}
  ` as { id: string; email: string; senha: string; nome_completo: string; role: string }[]
  return rows[0] ?? null
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const id = generateId()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  // Invalida tokens anteriores
  await sql`UPDATE password_resets SET used = 1 WHERE user_id = ${userId} AND used = 0`
  await sql`
    INSERT INTO password_resets (id, user_id, token, expires_at)
    VALUES (${id}, ${userId}, ${token}, ${expiresAt})
  `
  return token
}

export async function getValidResetToken(token: string): Promise<{ user_id: string } | null> {
  const rows = await sql`
    SELECT user_id FROM password_resets
    WHERE token = ${token} AND used = 0 AND expires_at > NOW()
  ` as { user_id: string }[]
  return rows[0] ?? null
}

export async function markResetTokenUsed(token: string): Promise<void> {
  await sql`UPDATE password_resets SET used = 1 WHERE token = ${token}`
}

export async function updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
  await sql`UPDATE users SET senha = ${hashedPassword}, updated_at = NOW() WHERE id = ${userId}`
}

export async function createUser(data: {
  email: string
  senha: string
  nome_completo: string
  role: string
  cnpj?: string
  nome_fantasia?: string
  razao_social?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  pais?: string
}): Promise<string> {
  const id = generateId()
  await sql`
    INSERT INTO users (
      id, email, senha, nome_completo, role,
      cnpj, nome_fantasia, razao_social,
      logradouro, numero, bairro, cidade, estado, pais
    ) VALUES (
      ${id}, ${data.email}, ${data.senha}, ${data.nome_completo}, ${data.role},
      ${data.cnpj ?? null}, ${data.nome_fantasia ?? null}, ${data.razao_social ?? null},
      ${data.logradouro ?? null}, ${data.numero ?? null}, ${data.bairro ?? null},
      ${data.cidade ?? null}, ${data.estado ?? null}, ${data.pais ?? null}
    )
  `
  return id
}
