'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'
import type { Cliente } from '@/lib/types'

export async function createClienteAction(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const id = generateId()
  try {
    database
      .prepare(
        `INSERT INTO clientes (id, user_id, tipo_pessoa, razao_social, nome_fantasia, cnpj, cpf, endereco, cidade, estado, cep, telefone, email, contato_responsavel, observacoes, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        data.tipo_pessoa || 'juridica',
        data.razao_social,
        data.nome_fantasia || null,
        data.cnpj || null,
        data.cpf || null,
        data.endereco || null,
        data.cidade || null,
        data.estado || null,
        data.cep || null,
        data.telefone || null,
        data.email || null,
        data.contato_responsavel || null,
        data.observacoes || null,
        data.ativo ? 1 : 0
      )
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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

  const database = getDb()
  try {
    const result = database
      .prepare(
        `UPDATE clientes SET tipo_pessoa=?, razao_social=?, nome_fantasia=?, cnpj=?, cpf=?, endereco=?, cidade=?, estado=?, cep=?, telefone=?, email=?, contato_responsavel=?, observacoes=?, ativo=?, updated_at=datetime('now')
         WHERE id=? AND user_id=?`
      )
      .run(
        data.tipo_pessoa || 'juridica',
        data.razao_social,
        data.nome_fantasia || null,
        data.cnpj || null,
        data.cpf || null,
        data.endereco || null,
        data.cidade || null,
        data.estado || null,
        data.cep || null,
        data.telefone || null,
        data.email || null,
        data.contato_responsavel || null,
        data.observacoes || null,
        data.ativo ? 1 : 0,
        id,
        userId
      )
    if (result.changes === 0) return { error: 'Cliente não encontrado' }
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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

  const database = getDb()
  const result = database.prepare('DELETE FROM clientes WHERE id=? AND user_id=?').run(id, userId)
  if (result.changes === 0) return { error: 'Cliente não encontrado' }
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
  return { success: true }
}
