// lib/company.ts
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function getCompanyData() {
  const userId = await getSessionUserId()
  if (!userId) throw new Error('Não autenticado')

  const db = getDb() // garante que o db exista
  const user = db
    .prepare(`
      SELECT
        id,
        nome_empresa,
        logo_url,
        cnpj,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email
      FROM users
      WHERE id = ?
    `)
    .get(userId)

  return user
}