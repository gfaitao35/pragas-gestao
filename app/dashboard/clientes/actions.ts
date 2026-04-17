'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'
import type { Cliente } from '@/lib/types'

export async function createClienteAction(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = generateId()
  try {
    await sql`
      INSERT INTO clientes (id, user_id, tipo_pessoa, razao_social, nome_fantasia, cnpj, cpf, endereco, cidade, estado, cep, telefone, email, contato_responsavel, observacoes, ativo)
      VALUES (${id}, ${userId}, ${data.tipo_pessoa || 'juridica'}, ${data.razao_social}, ${data.nome_fantasia || null}, ${data.cnpj || null}, ${data.cpf || null}, ${data.endereco || null}, ${data.cidade || null}, ${data.estado || null}, ${data.cep || null}, ${data.telefone || null}, ${data.email || null}, ${data.contato_responsavel || null}, ${data.observacoes || null}, ${data.ativo ? 1 : 0})
    `
  } catch (e: unknown) {
    const err = e as { code?: string; constraint?: string }
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      return { error: data.tipo_pessoa === 'fisica' ? 'CPF já cadastrado' : 'CNPJ já cadastrado' }
    }
    return { error: 'Erro ao cadastrar cliente' }
  }
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateClienteAction(
  id: string,
  data: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'user_id'>
) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  try {
    const result = await sql`
      UPDATE clientes SET 
        tipo_pessoa=${data.tipo_pessoa || 'juridica'}, 
        razao_social=${data.razao_social}, 
        nome_fantasia=${data.nome_fantasia || null}, 
        cnpj=${data.cnpj || null}, 
        cpf=${data.cpf || null}, 
        endereco=${data.endereco || null}, 
        cidade=${data.cidade || null}, 
        estado=${data.estado || null}, 
        cep=${data.cep || null}, 
        telefone=${data.telefone || null}, 
        email=${data.email || null}, 
        contato_responsavel=${data.contato_responsavel || null}, 
        observacoes=${data.observacoes || null}, 
        ativo=${data.ativo ? 1 : 0}, 
        updated_at=NOW()
      WHERE id=${id} AND user_id=${userId}
    `
    if (result.length === 0) return { error: 'Cliente não encontrado' }
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === '23505') {
      return { error: data.tipo_pessoa === 'fisica' ? 'CPF já cadastrado' : 'CNPJ já cadastrado' }
    }
    return { error: 'Erro ao atualizar cliente' }
  }
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteClienteAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const result = await sql`DELETE FROM clientes WHERE id=${id} AND user_id=${userId}`
  if (result.length === 0) return { error: 'Cliente não encontrado' }
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
  return { success: true }
}
