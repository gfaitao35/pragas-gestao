'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'
import type { StatusOrdemServico } from '@/lib/types'

function generateNumeroOS(database: ReturnType<typeof getDb>, userId: string): string {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const prefixo = `${ano}-${mes}-`

  const result = database.prepare(
    `SELECT numero_os FROM ordens_servico WHERE user_id = ? AND numero_os LIKE ? ORDER BY numero_os DESC LIMIT 1`
  ).get(userId, `${prefixo}%`) as { numero_os: string } | undefined

  let seq = 1
  if (result) {
    const partes = result.numero_os.split('-')
    const ultimo = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(ultimo)) seq = ultimo + 1
  }

  return `${prefixo}${String(seq).padStart(3, '0')}`
}

export async function createOrdemAction(data: {
  cliente_id: string
  data_execucao: string
  tipo_servico: string
  descricao_servico?: string | null
  local_execucao?: string | null
  equipamentos_utilizados?: string | null
  produtos_aplicados?: string | null
  area_tratada?: string | null
  pragas_alvo?: string | null
  tecnico_responsavel?: string | null
  status: StatusOrdemServico
  valor?: number | null
  garantia_meses?: number | null
  visitas_gratuitas?: number
  observacoes?: string | null
  numero_os?: string
  num_parcelas?: number
  dia_vencimento?: number
}) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const id = generateId()
  const numero_os = data.numero_os || generateNumeroOS(database, userId)
  const numParcelas = data.num_parcelas && data.num_parcelas > 1 ? data.num_parcelas : 1
  const diaVenc = data.dia_vencimento || null

  try {
    database
      .prepare(
        `INSERT INTO ordens_servico (id, user_id, cliente_id, numero_os, data_execucao, tipo_servico, descricao_servico, local_execucao, equipamentos_utilizados, produtos_aplicados, area_tratada, pragas_alvo, observacoes, tecnico_responsavel, status, valor, garantia_meses, visitas_gratuitas, num_parcelas, dia_vencimento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id, userId, data.cliente_id, numero_os, data.data_execucao, data.tipo_servico,
        data.descricao_servico ?? null, data.local_execucao ?? null,
        data.equipamentos_utilizados ?? null, data.produtos_aplicados ?? null,
        data.area_tratada ?? null, data.pragas_alvo ?? null, data.observacoes ?? null,
        data.tecnico_responsavel ?? null, data.status, data.valor ?? null,
        data.garantia_meses ?? null, data.visitas_gratuitas ?? 0, numParcelas, diaVenc
      )

    // Criar lançamentos de receita (1 por parcela)
    if (data.valor) {
      const valorParcela = data.valor / numParcelas
      const baseDate = new Date(data.data_execucao + 'T00:00:00')
      const dia = diaVenc || baseDate.getDate()

      for (let i = 0; i < numParcelas; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, dia)
        if (d.getMonth() !== (baseDate.getMonth() + i) % 12) d.setDate(0)
        const dataVenc = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const descricao = numParcelas > 1 ? `OS ${numero_os} (${i + 1}/${numParcelas})` : `OS ${numero_os}`
        database.prepare(`
          INSERT INTO lancamentos_financeiros (id, user_id, tipo, descricao, valor, data_lancamento, status, referencia_tipo, referencia_id)
          VALUES (?, ?, 'receita', ?, ?, ?, 'pendente', 'os', ?)
        `).run(generateId(), userId, descricao, valorParcela, dataVenc, id)
      }
    }
  } catch {
    return { error: 'Erro ao criar ordem de serviço' }
  }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/financeiro')
  return { success: true }
}

export async function updateOrdemAction(
  id: string,
  data: {
    cliente_id: string
    data_execucao: string
    tipo_servico: string
    descricao_servico?: string | null
    local_execucao?: string | null
    equipamentos_utilizados?: string | null
    produtos_aplicados?: string | null
    area_tratada?: string | null
    pragas_alvo?: string | null
    tecnico_responsavel?: string | null
    status: StatusOrdemServico
    valor?: number | null
    garantia_meses?: number | null
    visitas_gratuitas?: number
    observacoes?: string | null
  }
) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const result = database
    .prepare(
      `UPDATE ordens_servico SET cliente_id=?, data_execucao=?, tipo_servico=?, descricao_servico=?, local_execucao=?, equipamentos_utilizados=?, produtos_aplicados=?, area_tratada=?, pragas_alvo=?, observacoes=?, tecnico_responsavel=?, status=?, valor=?, garantia_meses=?, visitas_gratuitas=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    )
    .run(
      data.cliente_id,
      data.data_execucao,
      data.tipo_servico,
      data.descricao_servico ?? null,
      data.local_execucao ?? null,
      data.equipamentos_utilizados ?? null,
      data.produtos_aplicados ?? null,
      data.area_tratada ?? null,
      data.pragas_alvo ?? null,
      data.observacoes ?? null,
      data.tecnico_responsavel ?? null,
      data.status,
      data.valor ?? null,
      data.garantia_meses ?? null,
      data.visitas_gratuitas ?? 0,
      id,
      userId
    )
  if (result.changes === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteOrdemAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const result = database.prepare('DELETE FROM ordens_servico WHERE id=? AND user_id=?').run(id, userId)
  if (result.changes === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/financeiro')
  return { success: true }
}

export async function liquidarOrdemAction(
  id: string,
  data: { data_liquidacao: string; valor_pago?: number | null }
) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const result = database
    .prepare(
      'UPDATE ordens_servico SET liquidado=1, data_liquidacao=?, valor_pago=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?'
    )
    .run(data.data_liquidacao, data.valor_pago ?? null, id, userId)
  if (result.changes === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function desfazerLiquidacaoAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const result = database
    .prepare('UPDATE ordens_servico SET liquidado=0, data_liquidacao=NULL, valor_pago=NULL, updated_at=datetime(\'now\') WHERE id=? AND user_id=?')
    .run(id, userId)
  if (result.changes === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}