'use server'

import { revalidatePath } from 'next/cache'
import { sql, queryOne } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'
import type { StatusOrdemServico } from '@/lib/types'

async function generateNumeroOS(userId: string): Promise<string> {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const prefixo = `${ano}-${mes}-`

  const result = await queryOne<{ numero_os: string }>`
    SELECT numero_os FROM ordens_servico 
    WHERE user_id = ${userId} AND numero_os LIKE ${prefixo + '%'} 
    ORDER BY numero_os DESC LIMIT 1
  `

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

  const id = generateId()
  const numero_os = data.numero_os || await generateNumeroOS(userId)
  const numParcelas = data.num_parcelas && data.num_parcelas > 1 ? data.num_parcelas : 1
  const diaVenc = data.dia_vencimento || null

  try {
    await sql`
      INSERT INTO ordens_servico (id, user_id, cliente_id, numero_os, data_execucao, tipo_servico, descricao_servico, local_execucao, equipamentos_utilizados, produtos_aplicados, area_tratada, pragas_alvo, observacoes, tecnico_responsavel, status, valor, garantia_meses, visitas_gratuitas, num_parcelas, dia_vencimento)
      VALUES (${id}, ${userId}, ${data.cliente_id}, ${numero_os}, ${data.data_execucao}, ${data.tipo_servico}, ${data.descricao_servico ?? null}, ${data.local_execucao ?? null}, ${data.equipamentos_utilizados ?? null}, ${data.produtos_aplicados ?? null}, ${data.area_tratada ?? null}, ${data.pragas_alvo ?? null}, ${data.observacoes ?? null}, ${data.tecnico_responsavel ?? null}, ${data.status}, ${data.valor ?? null}, ${data.garantia_meses ?? null}, ${data.visitas_gratuitas ?? 0}, ${numParcelas}, ${diaVenc})
    `

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
        await sql`
          INSERT INTO lancamentos_financeiros (id, user_id, tipo, descricao, valor, data_lancamento, status, referencia_tipo, referencia_id)
          VALUES (${generateId()}, ${userId}, 'receita', ${descricao}, ${valorParcela}, ${dataVenc}, 'pendente', 'os', ${id})
        `
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

  const result = await sql`
    UPDATE ordens_servico SET 
      cliente_id=${data.cliente_id}, 
      data_execucao=${data.data_execucao}, 
      tipo_servico=${data.tipo_servico}, 
      descricao_servico=${data.descricao_servico ?? null}, 
      local_execucao=${data.local_execucao ?? null}, 
      equipamentos_utilizados=${data.equipamentos_utilizados ?? null}, 
      produtos_aplicados=${data.produtos_aplicados ?? null}, 
      area_tratada=${data.area_tratada ?? null}, 
      pragas_alvo=${data.pragas_alvo ?? null}, 
      observacoes=${data.observacoes ?? null}, 
      tecnico_responsavel=${data.tecnico_responsavel ?? null}, 
      status=${data.status}, 
      valor=${data.valor ?? null}, 
      garantia_meses=${data.garantia_meses ?? null}, 
      visitas_gratuitas=${data.visitas_gratuitas ?? 0}, 
      updated_at=NOW()
    WHERE id=${id} AND user_id=${userId}
  `
  if (result.length === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteOrdemAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const result = await sql`DELETE FROM ordens_servico WHERE id=${id} AND user_id=${userId}`
  if (result.length === 0) return { error: 'Ordem não encontrada' }
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

  const result = await sql`
    UPDATE ordens_servico SET liquidado=1, data_liquidacao=${data.data_liquidacao}, valor_pago=${data.valor_pago ?? null}, updated_at=NOW() 
    WHERE id=${id} AND user_id=${userId}
  `
  if (result.length === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function desfazerLiquidacaoAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const result = await sql`
    UPDATE ordens_servico SET liquidado=0, data_liquidacao=NULL, valor_pago=NULL, updated_at=NOW() 
    WHERE id=${id} AND user_id=${userId}
  `
  if (result.length === 0) return { error: 'Ordem não encontrada' }
  revalidatePath('/dashboard/ordens')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}
