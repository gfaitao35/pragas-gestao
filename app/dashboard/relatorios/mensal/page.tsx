import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import RelatorioMensalClient from '@/components/relatorios/relatorio-mensal-client'

export default async function RelatorioMensalPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  return <RelatorioMensalClient />
}
