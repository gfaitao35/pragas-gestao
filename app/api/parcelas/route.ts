import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { contrato_id, numero_parcela, valor_parcela, data_vencimento } = body

    if (!contrato_id || !numero_parcela || !valor_parcela || !data_vencimento) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    const [contrato] = await sql`
      SELECT * FROM contratos WHERE id = ${contrato_id} AND user_id = ${userId}
    `
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const [parcelaExistente] = await sql`
      SELECT id FROM parcelas WHERE contrato_id = ${contrato_id} AND numero_parcela = ${numero_parcela}
    `
    if (parcelaExistente) {
      return NextResponse.json({ error: 'Já existe uma parcela com esse número' }, { status: 400 })
    }

    const parcelaId = crypto.randomUUID()
    await sql`
      INSERT INTO parcelas (id, contrato_id, numero_parcela, valor_parcela, data_vencimento, status)
      VALUES (${parcelaId}, ${contrato_id}, ${numero_parcela}, ${valor_parcela}, ${data_vencimento}, 'pendente')
    `

    return NextResponse.json({
      success: true,
      parcela: { id: parcelaId, contrato_id, numero_parcela, valor_parcela, data_vencimento, status: 'pendente' }
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar parcela:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
