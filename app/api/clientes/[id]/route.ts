import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const [cliente] = await sql`
      SELECT * FROM clientes WHERE id = ${id} AND user_id = ${userId}
    `
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const ordens = await sql`
      SELECT id, numero_os, tipo_servico, data_execucao, status, valor, liquidado,
             local_execucao, pragas_alvo, area_tratada, garantia_meses
      FROM ordens_servico
      WHERE cliente_id = ${id} AND user_id = ${userId}
      ORDER BY data_execucao DESC
    `

    const certificados = await sql`
      SELECT c.id, c.numero_certificado, c.data_emissao, c.data_validade, c.tipo_certificado,
             o.numero_os, o.tipo_servico
      FROM certificados c
      LEFT JOIN ordens_servico o ON c.ordem_servico_id = o.id
      WHERE c.user_id = ${userId} AND o.cliente_id = ${id}
      ORDER BY c.data_emissao DESC
    `

    const laudos = await sql`
      SELECT l.id, l.numero_laudo, l.created_at,
             o.numero_os, o.tipo_servico, o.data_execucao
      FROM laudos l
      LEFT JOIN ordens_servico o ON l.ordem_servico_id = o.id
      WHERE l.user_id = ${userId} AND o.cliente_id = ${id}
      ORDER BY l.created_at DESC
    `

    const documentos = await sql`
      SELECT * FROM cliente_documentos
      WHERE cliente_id = ${id} AND user_id = ${userId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ cliente, ordens, certificados, laudos, documentos })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
