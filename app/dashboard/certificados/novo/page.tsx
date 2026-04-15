import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { CertificadoForm } from '@/components/certificados/certificado-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { OrdemServico, Cliente } from '@/lib/types'

interface Props {
  searchParams: Promise<{ ordem_id?: string }>
}

function rowToOrdem(row: Record<string, unknown>, cliente?: Partial<Cliente>): OrdemServico {
  return {
    id: row.id as string,
    numero_os: row.numero_os as string,
    cliente_id: row.cliente_id as string,
    data_execucao: row.data_execucao as string,
    tipo_servico: row.tipo_servico as string,
    descricao_servico: (row.descricao_servico as string) || null,
    local_execucao: (row.local_execucao as string) || null,
    equipamentos_utilizados: (row.equipamentos_utilizados as string) || null,
    produtos_aplicados: (row.produtos_aplicados as string) || null,
    area_tratada: (row.area_tratada as string) || null,
    pragas_alvo: (row.pragas_alvo as string) || null,
    observacoes: (row.observacoes as string) || null,
    tecnico_responsavel: (row.tecnico_responsavel as string) || null,
    status: row.status as OrdemServico['status'],
    valor: (row.valor as number) ?? null,
    liquidado: (row.liquidado as number) === 1,
    data_liquidacao: (row.data_liquidacao as string) || null,
    valor_pago: (row.valor_pago as number) ?? null,

    // 🔥 ESTES ESTAVAM FALTANDO
    garantia_meses: (row.garantia_meses as number) ?? null,
    visitas_gratuitas: (row.visitas_gratuitas as number) ?? 0,
    contrato_id: (row.contrato_id as string) ?? null,

    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
    cliente,
  }
}

export default async function NovoCertificadoPage({ searchParams }: Props) {
  const params = await searchParams
  const ordemId = params.ordem_id

  if (!ordemId) {
    redirect('/dashboard/ordens')
  }

  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const database = getDb()
  const ordemRow = database.prepare('SELECT * FROM ordens_servico WHERE id = ? AND user_id = ?').get(ordemId, userId) as Record<string, unknown> | undefined

  if (!ordemRow) {
    redirect('/dashboard/ordens')
  }

  const clienteRow = database.prepare('SELECT * FROM clientes WHERE id = ?').get(ordemRow.cliente_id) as Record<string, unknown> | undefined
  const cliente: Partial<Cliente> | undefined = clienteRow
    ? {
        id: clienteRow.id as string,
        tipo_pessoa: (clienteRow.tipo_pessoa as 'fisica' | 'juridica') || 'juridica',
        razao_social: clienteRow.razao_social as string,
        nome_fantasia: (clienteRow.nome_fantasia as string) || null,
        cnpj: (clienteRow.cnpj as string) || '',
        cpf: (clienteRow.cpf as string) || null,
        endereco: (clienteRow.endereco as string) || null,
        cidade: (clienteRow.cidade as string) || null,
        estado: (clienteRow.estado as string) || null,
      }
    : undefined

  const ordem = rowToOrdem(ordemRow, cliente)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerar Certificado</h1>
        <p className="text-muted-foreground">
          Emita um novo certificado para a ordem de serviço {ordem.numero_os}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Certificado</CardTitle>
          <CardDescription>
            Preencha os dados para gerar o certificado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CertificadoForm ordem={ordem} />
        </CardContent>
      </Card>
    </div>
  )
}
