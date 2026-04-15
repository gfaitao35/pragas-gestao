import React from 'react'
import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/session'
import { sql } from '@/lib/db'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import type { Profile } from '@/lib/types'
import { getThemeVarsFromHex } from '@/lib/theme'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userId = await getSessionUserId()
  if (!userId) {
    redirect('/auth/login')
  }

  const userRows = await sql`
    SELECT id, nome_completo, role, nome_fantasia, created_at, updated_at
    FROM users
    WHERE id = ${userId}
  `
  const row = userRows[0] as {
    id: string
    nome_completo: string
    role: string
    nome_fantasia: string | null
    created_at: string
    updated_at: string
  } | undefined

  const profile: Profile | null = row
    ? {
        id: row.id,
        nome_completo: row.nome_completo,
        role: row.role as Profile['role'],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    : null
  const nomeFantasia = row?.nome_fantasia || ''

  const cfgRows = await sql`
    SELECT cor_sistema FROM empresa_config WHERE user_id = ${userId}
  `
  const corSistema = (cfgRows[0] as { cor_sistema?: string } | undefined)?.cor_sistema

  let serverCssVars = ''
  if (corSistema) {
    const vars = getThemeVarsFromHex(corSistema)
    serverCssVars = `:root { ${Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ')} }`
  }

  return (
    <SidebarProvider>
      {serverCssVars ? <style dangerouslySetInnerHTML={{ __html: serverCssVars }} /> : null}
      <AppSidebar profile={profile} nomeFantasia={nomeFantasia} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}