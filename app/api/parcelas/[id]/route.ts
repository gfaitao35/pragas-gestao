import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toLocalDateInput } from '@/lib/utils'

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
    const { status, data_pagamento, valor_pago, forma_pagamento } = body

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 })
    }

    const [parcela] = await sql`
      SELECT p.*, c.user_id
      FROM parcelas p
      LEFT JOIN contratos c ON p.contrato_id = c.id
      WHERE p.id = ${id} AND c.user_id = ${userId}
    `
    if (!parcela) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
    }

    await sql`
      UPDATE parcelas
      SET status = ${status}, data_pagamento = ${data_pagamento || null},
          valor_pago = ${valor_pago || null}, forma_pagamento = ${forma_pagamento || null},
          updated_at = NOW()
      WHERE id = ${id}
    `

    // Criar lançamento financeiro ao pagar
    if (status === 'paga') {
      const lancId = crypto.randomUUID()
      await sql`
        INSERT INTO lancamentos_financeiros (
          id, user_id, tipo, descricao, valor, data_lancamento, data_pagamento,
          status, forma_pagamento, referencia_tipo, referencia_id
        ) VALUES (
          ${lancId}, ${userId}, 'receita',
          ${`Parcela ${parcela.numero_parcela} - Contrato ${parcela.contrato_id}`},
          ${valor_pago || parcela.valor_parcela},
          ${data_pagamento || toLocalDateInput()},
          ${data_pagamento || toLocalDateInput()},
          'pago',
          ${forma_pagamento || null},
          'contrato',
          ${parcela.contrato_id}
        )
      `

      // Verificar se todas as parcelas foram pagas
      const [{ count }] = await sql`
        SELECT COUNT(*) as count
        FROM parcelas p
        LEFT JOIN contratos c ON p.contrato_id = c.id
        WHERE p.contrato_id = ${parcela.contrato_id} AND p.status != 'paga' AND c.user_id = ${userId}
      `

      if (Number(count) === 0) {
        await sql`
          UPDATE contratos SET status = 'concluido', updated_at = NOW()
          WHERE id = ${parcela.contrato_id} AND user_id = ${userId}
        `
      }
    }

    return NextResponse.json({ success: true, message: 'Parcela atualizada com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar parcela:', error)
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

    const [parcela] = await sql`
      SELECT p.id FROM parcelas p
      LEFT JOIN contratos c ON p.contrato_id = c.id
      WHERE p.id = ${id} AND c.user_id = ${userId}
    `
    if (!parcela) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
    }

    await sql`DELETE FROM parcelas WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir parcela:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
