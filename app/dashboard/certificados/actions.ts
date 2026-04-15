'use server'

import { revalidatePath } from 'next/cache'
import { sql, queryOne } from '@/lib/db'
import { generateId } from '@/lib/auth'
import { getSessionUserId } from '@/lib/session'

async function generateNumeroCertificado(userId: string): Promise<string> {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const prefixo = `CERT-${ano}-${mes}-`

  const result = await queryOne<{ numero_certificado: string }>`
    SELECT numero_certificado FROM certificados 
    WHERE user_id = ${userId} AND numero_certificado LIKE ${prefixo + '%'} 
    ORDER BY numero_certificado DESC LIMIT 1
  `

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

  const id = generateId()
  const numero_certificado = data.numero_certificado || await generateNumeroCertificado(userId)
  try {
    await sql`
      INSERT INTO certificados (id, user_id, ordem_servico_id, numero_certificado, data_emissao, data_validade, tipo_certificado, observacoes)
      VALUES (${id}, ${userId}, ${data.ordem_servico_id}, ${numero_certificado}, ${data.data_emissao}, ${data.data_validade}, ${data.tipo_certificado}, ${data.observacoes ?? null})
    `
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

  const result = await sql`DELETE FROM certificados WHERE id=${id} AND user_id=${userId}`
  if (result.length === 0) return { error: 'Certificado não encontrado' }
  revalidatePath('/dashboard/certificados')
  revalidatePath('/dashboard')
  return { success: true }
}
