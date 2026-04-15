import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const [existing] = await sql`
      SELECT id FROM lancamentos_financeiros WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
    }

    await sql`
      UPDATE lancamentos_financeiros SET
        tipo = COALESCE(${body.tipo || null}, tipo),
        categoria_id = ${body.categoria_id !== undefined ? body.categoria_id : null},
        descricao = COALESCE(${body.descricao || null}, descricao),
        valor = COALESCE(${body.valor || null}, valor),
        data_lancamento = COALESCE(${body.data_lancamento || null}, data_lancamento),
        data_pagamento = ${body.data_pagamento || null},
        status = COALESCE(${body.status || null}, status),
        forma_pagamento = ${body.forma_pagamento || null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar lançamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const result = await sql`
      DELETE FROM lancamentos_financeiros WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir lançamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
