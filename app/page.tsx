import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/session'

export default async function HomePage() {
  const userId = await getSessionUserId()
  if (userId) {
    redirect('/dashboard')
  } else {
    redirect('/auth/login')
  }
}
