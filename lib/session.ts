import { cookies } from 'next/headers'
import { getSessionCookieName, parseSessionCookie } from '@/lib/auth'

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(getSessionCookieName())?.value
  const user = value ? parseSessionCookie(value) : null
  return user?.id ?? null
}
