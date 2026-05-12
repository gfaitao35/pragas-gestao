'use server'

import { revalidatePath } from 'next/cache'
import { sql, query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'
import type { Veiculo, VeiculoDocumento, Manutencao, Abastecimento } from '@/lib/types'

// ===== VEÍCULOS =====

export async function createVeiculoAction(data: Omit<Veiculo, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = generateId()
  try {
    await sql`
      INSERT INTO veiculos (id, user_id, modelo, marca, placa, ano, cor, quilometragem, tipo_combustivel, observacoes, ativo)
      VALUES (${id}, ${userId}, ${data.modelo}, ${data.marca || null}, ${data.placa}, ${data.ano || null}, ${data.cor || null}, ${data.quilometragem || 0}, ${data.tipo_combustivel || null}, ${data.observacoes || null}, ${data.ativo ? 1 : 0})
    `
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === '23505') {
      return { error: 'Placa já cadastrada' }
    }
    return { error: 'Erro ao cadastrar veículo' }
  }
  revalidatePath('/dashboard/frotas')
  return { success: true, id }
}

export async function updateVeiculoAction(id: string, data: Omit<Veiculo, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  try {
    await sql`
      UPDATE veiculos SET 
        modelo=${data.modelo}, 
        marca=${data.marca || null}, 
        placa=${data.placa}, 
        ano=${data.ano || null}, 
        cor=${data.cor || null}, 
        quilometragem=${data.quilometragem || 0}, 
        tipo_combustivel=${data.tipo_combustivel || null}, 
        observacoes=${data.observacoes || null}, 
        ativo=${data.ativo ? 1 : 0}, 
        updated_at=NOW()
      WHERE id=${id} AND user_id=${userId}
    `
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === '23505') {
      return { error: 'Placa já cadastrada' }
    }
    return { error: 'Erro ao atualizar veículo' }
  }
  revalidatePath('/dashboard/frotas')
  revalidatePath(`/dashboard/frotas/${id}`)
  return { success: true }
}

export async function deleteVeiculoAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  await sql`DELETE FROM veiculos WHERE id=${id} AND user_id=${userId}`
  revalidatePath('/dashboard/frotas')
  return { success: true }
}

// ===== DOCUMENTOS =====

export async function createDocumentoAction(data: Omit<VeiculoDocumento, 'id' | 'created_at' | 'user_id'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = generateId()
  await sql`
    INSERT INTO veiculo_documentos (id, veiculo_id, user_id, nome, tipo, url, tamanho)
    VALUES (${id}, ${data.veiculo_id}, ${userId}, ${data.nome}, ${data.tipo}, ${data.url}, ${data.tamanho || null})
  `
  revalidatePath(`/dashboard/frotas/${data.veiculo_id}`)
  return { success: true, id }
}

export async function deleteDocumentoAction(id: string, veiculoId: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  await sql`DELETE FROM veiculo_documentos WHERE id=${id} AND user_id=${userId}`
  revalidatePath(`/dashboard/frotas/${veiculoId}`)
  return { success: true }
}

// ===== MANUTENÇÕES =====

async function criarDespesaFinanceira(
  userId: string,
  descricao: string,
  valor: number,
  data: string,
  referenciaId: string,
  referenciaTipo: 'manutencao' | 'abastecimento'
) {
  const id = generateId()
  
  // Buscar ou criar categoria de despesa para veículos
  let categoriaId: string | null = null
  const categoria = await queryOne<{ id: string }>`
    SELECT id FROM categorias_financeiras 
    WHERE user_id = ${userId} AND nome ILIKE '%veículo%' AND tipo = 'despesa'
    LIMIT 1
  `
  
  if (categoria) {
    categoriaId = categoria.id
  } else {
    // Criar categoria se não existir
    const novaCategoriaId = generateId()
    await sql`
      INSERT INTO categorias_financeiras (id, user_id, nome, tipo, cor)
      VALUES (${novaCategoriaId}, ${userId}, 'Veículos / Frotas', 'despesa', '#6366f1')
    `
    categoriaId = novaCategoriaId
  }
  
  await sql`
    INSERT INTO lancamentos_financeiros (id, user_id, tipo, categoria_id, descricao, valor, data_lancamento, status, referencia_tipo, referencia_id)
    VALUES (${id}, ${userId}, 'despesa', ${categoriaId}, ${descricao}, ${valor}, ${data}, 'pendente', ${referenciaTipo}, ${referenciaId})
  `
  
  return id
}

export async function createManutencaoAction(data: Omit<Manutencao, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'lancamento_id'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = generateId()
  
  // Buscar dados do veículo para descrição
  const veiculo = await queryOne<{ modelo: string; placa: string }>`
    SELECT modelo, placa FROM veiculos WHERE id = ${data.veiculo_id} AND user_id = ${userId}
  `
  
  if (!veiculo) return { error: 'Veículo não encontrado' }
  
  // Criar despesa no financeiro
  const tipoManutencaoLabel: Record<string, string> = {
    'preventiva': 'Preventiva',
    'corretiva': 'Corretiva',
    'revisao': 'Revisão',
    'troca_oleo': 'Troca de Óleo',
    'pneus': 'Pneus',
    'freios': 'Freios',
    'outros': 'Outros'
  }
  
  const descricao = `Manutenção (${tipoManutencaoLabel[data.tipo_manutencao] || data.tipo_manutencao}) - ${veiculo.modelo} (${veiculo.placa})`
  const lancamentoId = await criarDespesaFinanceira(userId, descricao, data.valor, data.data_manutencao, id, 'manutencao')
  
  await sql`
    INSERT INTO manutencoes (id, veiculo_id, user_id, tipo_manutencao, descricao, data_manutencao, quilometragem, valor, fornecedor, observacoes, lancamento_id)
    VALUES (${id}, ${data.veiculo_id}, ${userId}, ${data.tipo_manutencao}, ${data.descricao || null}, ${data.data_manutencao}, ${data.quilometragem || null}, ${data.valor}, ${data.fornecedor || null}, ${data.observacoes || null}, ${lancamentoId})
  `
  
  // Atualizar quilometragem do veículo se informada
  if (data.quilometragem) {
    await sql`
      UPDATE veiculos SET quilometragem = ${data.quilometragem}, updated_at = NOW()
      WHERE id = ${data.veiculo_id} AND user_id = ${userId} AND quilometragem < ${data.quilometragem}
    `
  }
  
  revalidatePath(`/dashboard/frotas/${data.veiculo_id}`)
  revalidatePath('/dashboard/frotas')
  revalidatePath('/dashboard/financeiro')
  return { success: true, id }
}

export async function deleteManutencaoAction(id: string, veiculoId: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  // Buscar lançamento vinculado
  const manutencao = await queryOne<{ lancamento_id: string | null }>`
    SELECT lancamento_id FROM manutencoes WHERE id = ${id} AND user_id = ${userId}
  `
  
  if (manutencao?.lancamento_id) {
    await sql`DELETE FROM lancamentos_financeiros WHERE id = ${manutencao.lancamento_id} AND user_id = ${userId}`
  }
  
  await sql`DELETE FROM manutencoes WHERE id=${id} AND user_id=${userId}`
  revalidatePath(`/dashboard/frotas/${veiculoId}`)
  revalidatePath('/dashboard/frotas')
  revalidatePath('/dashboard/financeiro')
  return { success: true }
}

// ===== ABASTECIMENTOS =====

export async function createAbastecimentoAction(data: Omit<Abastecimento, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'lancamento_id'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = generateId()
  
  // Buscar dados do veículo para descrição
  const veiculo = await queryOne<{ modelo: string; placa: string }>`
    SELECT modelo, placa FROM veiculos WHERE id = ${data.veiculo_id} AND user_id = ${userId}
  `
  
  if (!veiculo) return { error: 'Veículo não encontrado' }
  
  // Criar despesa no financeiro
  const descricao = `Abastecimento - ${veiculo.modelo} (${veiculo.placa}) - ${data.litros}L`
  const lancamentoId = await criarDespesaFinanceira(userId, descricao, data.valor_total, data.data_abastecimento, id, 'abastecimento')
  
  await sql`
    INSERT INTO abastecimentos (id, veiculo_id, user_id, data_abastecimento, quilometragem, litros, valor_litro, valor_total, tipo_combustivel, posto, observacoes, lancamento_id)
    VALUES (${id}, ${data.veiculo_id}, ${userId}, ${data.data_abastecimento}, ${data.quilometragem || null}, ${data.litros}, ${data.valor_litro}, ${data.valor_total}, ${data.tipo_combustivel || null}, ${data.posto || null}, ${data.observacoes || null}, ${lancamentoId})
  `
  
  // Atualizar quilometragem do veículo se informada
  if (data.quilometragem) {
    await sql`
      UPDATE veiculos SET quilometragem = ${data.quilometragem}, updated_at = NOW()
      WHERE id = ${data.veiculo_id} AND user_id = ${userId} AND quilometragem < ${data.quilometragem}
    `
  }
  
  revalidatePath(`/dashboard/frotas/${data.veiculo_id}`)
  revalidatePath('/dashboard/frotas')
  revalidatePath('/dashboard/financeiro')
  return { success: true, id }
}

export async function deleteAbastecimentoAction(id: string, veiculoId: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  // Buscar lançamento vinculado
  const abastecimento = await queryOne<{ lancamento_id: string | null }>`
    SELECT lancamento_id FROM abastecimentos WHERE id = ${id} AND user_id = ${userId}
  `
  
  if (abastecimento?.lancamento_id) {
    await sql`DELETE FROM lancamentos_financeiros WHERE id = ${abastecimento.lancamento_id} AND user_id = ${userId}`
  }
  
  await sql`DELETE FROM abastecimentos WHERE id=${id} AND user_id=${userId}`
  revalidatePath(`/dashboard/frotas/${veiculoId}`)
  revalidatePath('/dashboard/frotas')
  revalidatePath('/dashboard/financeiro')
  return { success: true }
}
