import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, FileText, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { ContratosList } from '@/components/contratos/contratos-list'

export default async function ContratosPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const database = getDb()

  const contratos = database
    .prepare(
      `SELECT c.*, cl.razao_social 
       FROM contratos c 
       LEFT JOIN clientes cl ON c.cliente_id = cl.id 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`
    )
    .all(userId) as (Record<string, unknown>)[]

  const stats = database.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
      SUM(CASE WHEN status = 'ativo' THEN valor_total ELSE 0 END) as valor_total_ativos
    FROM contratos WHERE user_id = ?
  `).get(userId) as { total: number; ativos: number; valor_total_ativos: number }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Gerencie os contratos de serviços</p>
        </div>
        <Link href="/dashboard/contratos/novo">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Contratos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Contratos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Ativos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total Ativo
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.valor_total_ativos || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Contratos ativos</p>
          </CardContent>
        </Card>
      </div>

      <ContratosList
        contratos={contratos.map((c) => ({
          id: c.id as string,
          numero_contrato: c.numero_contrato as string,
          razao_social: (c.razao_social as string) || null,
          status: c.status as string,
          data_inicio: c.data_inicio as string,
          data_fim: c.data_fim as string,
          valor_total: c.valor_total as number,
          numero_parcelas: c.numero_parcelas as number,
          valor_parcela: c.valor_parcela as number,
        }))}
      />
    </div>
  )
}
