import { query, queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ClipboardList, CheckCircle, Award, FileText } from 'lucide-react'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'

type OrdemRecente = {
  id: string
  numero_os: string
  razao_social: string | null
  tipo_servico: string
  status: string
  data_execucao: string
}

export default async function DashboardPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const [
    totalClientesRow,
    contratosEmVigorRow,
    ordensAtivasRow,
    ordensConcluídasRow,
    certificadosEmitidosRow,
    ordensRecentesRows,
  ] = await Promise.all([
    queryOne<{ c: string }>`
      SELECT COUNT(*) as c FROM clientes WHERE user_id = ${userId}
    `,
    queryOne<{ c: string }>`
      SELECT COUNT(*) as c
      FROM contratos
      WHERE user_id = ${userId}
        AND CURRENT_DATE BETWEEN data_inicio AND data_fim
    `,
    queryOne<{ c: string }>`
      SELECT COUNT(*) as c
      FROM ordens_servico
      WHERE user_id = ${userId}
        AND status IN ('pendente', 'em_andamento')
    `,
    queryOne<{ c: string }>`
      SELECT COUNT(*) as c
      FROM ordens_servico
      WHERE user_id = ${userId}
        AND status = 'concluida'
    `,
    queryOne<{ c: string }>`
      SELECT COUNT(*) as c FROM certificados WHERE user_id = ${userId}
    `,
    query<OrdemRecente>`
      SELECT o.*, c.razao_social
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id = ${userId}
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
  ])

  const totalClientes = Number(totalClientesRow?.c ?? 0)
  const contratosEmVigor = Number(contratosEmVigorRow?.c ?? 0)
  const ordensAtivas = Number(ordensAtivasRow?.c ?? 0)
  const ordensConcluidas = Number(ordensConcluídasRow?.c ?? 0)
  const certificadosEmitidos = Number(certificadosEmitidosRow?.c ?? 0)

  const stats = [
    {
      title: 'Total de Clientes',
      value: totalClientes,
      description: 'Clientes cadastrados',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Contratos em Vigor',
      value: contratosEmVigor,
      description: 'Contratos ativos atualmente',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Ordens Ativas',
      value: ordensAtivas,
      description: 'Pendentes ou em andamento',
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Ordens Concluídas',
      value: ordensConcluidas,
      description: 'Serviços finalizados',
      icon: CheckCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Certificados Emitidos',
      value: certificadosEmitidos,
      description: 'Certificados gerados',
      icon: Award,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendente: {
        label: 'Pendente',
        className: 'bg-primary/10 text-primary',
      },
      em_andamento: {
        label: 'Em andamento',
        className: 'bg-primary/10 text-primary',
      },
      concluida: {
        label: 'Concluída',
        className: 'bg-primary/10 text-primary',
      },
      cancelada: {
        label: 'Cancelada',
        className: 'bg-destructive/10 text-destructive',
      },
    }
    return statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço Recentes</CardTitle>
          <CardDescription>Últimas ordens de serviço registradas no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {ordensRecentesRows.length > 0 ? (
            <div className="space-y-4">
              {ordensRecentesRows.map((ordem) => {
                const statusBadge = getStatusBadge(ordem.status)
                return (
                  <div
                    key={ordem.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{ordem.numero_os}</p>
                      <p className="text-sm text-muted-foreground">
                        {ordem.razao_social || 'Cliente não encontrado'}
                      </p>
                      <p className="text-xs text-muted-foreground">{ordem.tipo_servico}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateBRFromYYYYMMDD(ordem.data_execucao)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada</p>
              <p className="text-sm text-muted-foreground">
                Comece criando uma nova ordem de serviço
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}