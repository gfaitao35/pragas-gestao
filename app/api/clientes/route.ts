import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clientes = await sql`
      SELECT * FROM clientes
      WHERE user_id = ${userId} AND ativo = 1
      ORDER BY razao_social ASC
    `

    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
