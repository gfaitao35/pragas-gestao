// lib/company.ts
import { queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function getCompanyData() {
  const userId = await getSessionUserId()
  if (!userId) throw new Error('Não autenticado')

  const user = await queryOne`
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
    WHERE id = ${userId}
  `

  return user
}
