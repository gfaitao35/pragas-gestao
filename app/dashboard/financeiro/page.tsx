import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { FinanceiroClient } from '@/components/financeiro/financeiro-client'
import type { OrdemServico, Cliente } from '@/lib/types'

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
    num_parcelas: (row.num_parcelas as number) ?? 1,
    dia_vencimento: (row.dia_vencimento as number) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
    cliente: cliente ?? undefined,
  }
}

export default async function FinanceiroPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const database = getDb()
  const ordensRows = database.prepare('SELECT * FROM ordens_servico WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[]
  const clientesRows = database.prepare('SELECT * FROM clientes WHERE user_id = ?').all(userId) as Record<string, unknown>[]

  const contratosRows = database.prepare(`
    SELECT c.*, cl.razao_social FROM contratos c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id WHERE c.user_id = ?
  `).all(userId) as any[]

  const parcelasRows = database.prepare(`
    SELECT p.*, c.numero_contrato, cl.razao_social as cliente_razao_social
    FROM parcelas p LEFT JOIN contratos c ON p.contrato_id = c.id
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    WHERE c.user_id = ? ORDER BY p.data_vencimento ASC
  `).all(userId) as any[]

  const clientesMap = new Map<string, Cliente>()
  for (const r of clientesRows) {
    clientesMap.set(r.id as string, {
      id: r.id as string,
      tipo_pessoa: (r.tipo_pessoa as 'fisica' | 'juridica') || 'juridica',
      razao_social: r.razao_social as string,
      nome_fantasia: (r.nome_fantasia as string) || null,
      cnpj: (r.cnpj as string) || '',
      cpf: (r.cpf as string) || null,
      endereco: (r.endereco as string) || null,
      cidade: (r.cidade as string) || null,
      estado: (r.estado as string) || null,
      cep: (r.cep as string) || null,
      telefone: (r.telefone as string) || null,
      email: (r.email as string) || null,
      contato_responsavel: (r.contato_responsavel as string) || null,
      observacoes: (r.observacoes as string) || null,
      ativo: (r.ativo as number) === 1,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      user_id: r.user_id as string,
    })
  }
  const ordens = ordensRows.map((r) => rowToOrdem(r, clientesMap.get(r.cliente_id as string)))

  return (
    <FinanceiroClient
      ordens={ordens}
      contratos={contratosRows}
      parcelas={parcelasRows}
    />
  )
}
