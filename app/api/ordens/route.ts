import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const ordens = await sql`
      SELECT o.id, o.numero_os, o.tipo_servico, o.data_execucao, o.status,
             c.razao_social as cliente_razao_social
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id = ${userId}
      ORDER BY o.created_at DESC
      LIMIT 200
    `

    const result = ordens.map((o: any) => ({
      id: o.id,
      numero_os: o.numero_os,
      tipo_servico: o.tipo_servico,
      data_execucao: o.data_execucao,
      status: o.status,
      cliente: { razao_social: o.cliente_razao_social },
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
