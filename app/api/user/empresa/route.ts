import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/session'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const [user] = await sql`
      SELECT
        nome_fantasia    AS "nomeFantasia",
        razao_social     AS "razaoSocial",
        cnpj,
        email,
        nome_completo    AS "nomeCompleto",
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        pais
      FROM users
      WHERE id = ${userId}
    `

    if (!user) {
      return NextResponse.json({ error: 'Dados não encontrados' }, { status: 404 })
    }

    return NextResponse.json({
      nomeFantasia: user.nomeFantasia || '',
      razaoSocial: user.razaoSocial || '',
      cnpj: user.cnpj || '',
      email: user.email || '',
      nomeCompleto: user.nomeCompleto || '',
      logradouro: user.logradouro || '',
      numero: user.numero || '',
      bairro: user.bairro || '',
      cidade: user.cidade || '',
      estado: user.estado || '',
      pais: user.pais || '',
    })
  } catch (error) {
    console.error('[API /user/empresa] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
