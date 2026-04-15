'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'

function generateNumeroCertificado(database: ReturnType<typeof getDb>, userId: string): string {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const prefixo = `CERT-${ano}-${mes}-`

  const result = database.prepare(
    `SELECT numero_certificado FROM certificados WHERE user_id = ? AND numero_certificado LIKE ? ORDER BY numero_certificado DESC LIMIT 1`
  ).get(userId, `${prefixo}%`) as { numero_certificado: string } | undefined

  let seq = 1
  if (result) {
    const partes = result.numero_certificado.split('-')
    const ultimo = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(ultimo)) seq = ultimo + 1
  }

  return `${prefixo}${String(seq).padStart(3, '0')}`
}

export async function createCertificadoAction(data: {
  ordem_servico_id: string
  numero_certificado?: string
  data_emissao: string
  data_validade: string
  tipo_certificado: string
  observacoes?: string | null
}) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const id = generateId()
  const numero_certificado = data.numero_certificado || generateNumeroCertificado(database, userId)
  try {
    database
      .prepare(
        `INSERT INTO certificados (id, user_id, ordem_servico_id, numero_certificado, data_emissao, data_validade, tipo_certificado, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        data.ordem_servico_id,
        numero_certificado,
        data.data_emissao,
        data.data_validade,
        data.tipo_certificado,
        data.observacoes ?? null
      )
  } catch {
    return { error: 'Erro ao gerar certificado' }
  }
  revalidatePath('/dashboard/certificados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteCertificadoAction(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const database = getDb()
  const result = database.prepare('DELETE FROM certificados WHERE id=? AND user_id=?').run(id, userId)
  if (result.changes === 0) return { error: 'Certificado não encontrado' }
  revalidatePath('/dashboard/certificados')
  revalidatePath('/dashboard')
  return { success: true }
}