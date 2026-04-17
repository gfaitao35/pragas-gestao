import { query } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { OrdensTable } from '@/components/ordens/ordens-table'
import { OrdemForm } from '@/components/ordens/ordem-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { OrdemServico, Cliente } from '@/lib/types'

function rowToCliente(row: Record<string, unknown>): Pick<Cliente, 'id' | 'razao_social' | 'nome_fantasia'> {
  return {
    id: row.id as string,
    razao_social: row.razao_social as string,
    nome_fantasia: (row.nome_fantasia as string) || null,
  }
}

function rowToClienteFull(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    tipo_pessoa: (row.tipo_pessoa as 'fisica' | 'juridica') || 'juridica',
    razao_social: row.razao_social as string,
    nome_fantasia: (row.nome_fantasia as string) || null,
    cnpj: (row.cnpj as string) || '',
    cpf: (row.cpf as string) || null,
    endereco: (row.endereco as string) || null,
    cidade: (row.cidade as string) || null,
    estado: (row.estado as string) || null,
    cep: (row.cep as string) || null,
    telefone: (row.telefone as string) || null,
    email: (row.email as string) || null,
    contato_responsavel: (row.contato_responsavel as string) || null,
    observacoes: (row.observacoes as string) || null,
    ativo: (row.ativo as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
  }
}

function rowToOrdem(row: Record<string, unknown>, cliente?: Cliente): OrdemServico {
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
    garantia_meses: (row.garantia_meses as number) ?? null,
    visitas_gratuitas: (row.visitas_gratuitas as number) ?? 0,
    contrato_id: (row.contrato_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
    cliente: cliente ?? undefined,
  }
}

export default async function OrdensPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const ordensRows = await query<Record<string, unknown>>`SELECT * FROM ordens_servico WHERE user_id = ${userId} ORDER BY created_at DESC`
  const clientesRows = await query<Record<string, unknown>>`SELECT id, razao_social, nome_fantasia FROM clientes WHERE user_id = ${userId} AND ativo = 1 ORDER BY razao_social ASC`
  const clientesFullRows = await query<Record<string, unknown>>`SELECT * FROM clientes WHERE user_id = ${userId}`

  const clientesFullMap = new Map<string, Cliente>()
  for (const r of clientesFullRows) {
    clientesFullMap.set(r.id as string, rowToClienteFull(r))
  }
  const ordens = ordensRows.map((r) => rowToOrdem(r, clientesFullMap.get(r.cliente_id as string)))
  const clientes = clientesRows.map(rowToCliente)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie as ordens de serviço</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Ordem de Serviço</DialogTitle>
            </DialogHeader>
            <OrdemForm clientes={clientes} />
          </DialogContent>
        </Dialog>
      </div>

      <OrdensTable ordens={ordens} clientes={clientes} />
    </div>
  )
}
