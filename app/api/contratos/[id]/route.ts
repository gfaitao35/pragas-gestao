import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    const { id } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const [contrato] = await sql`
      SELECT c.*, cl.razao_social, cl.nome_fantasia
      FROM contratos c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ${id} AND c.user_id = ${userId}
    `

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const parcelas = await sql`
      SELECT * FROM parcelas
      WHERE contrato_id = ${id}
      ORDER BY numero_parcela ASC
    `

    return NextResponse.json({ contrato, parcelas })
  } catch (error) {
    console.error('Erro ao buscar contrato:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: any
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const [existing] = await sql`
      SELECT id FROM contratos WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    await sql`
      UPDATE contratos SET
        valor_total = COALESCE(${body.valor_total || null}, valor_total),
        numero_parcelas = COALESCE(${body.numero_parcelas || null}, numero_parcelas),
        valor_parcela = COALESCE(${body.valor_parcela || null}, valor_parcela),
        dia_vencimento = COALESCE(${body.dia_vencimento || null}, dia_vencimento),
        data_inicio = COALESCE(${body.data_inicio || null}, data_inicio),
        data_fim = COALESCE(${body.data_fim || null}, data_fim),
        status = COALESCE(${body.status || null}, status),
        observacoes = ${body.observacoes !== undefined ? body.observacoes : null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    // Cascata manual (PostgreSQL com ON DELETE CASCADE já cuida, mas por segurança)
    const result = await sql`
      DELETE FROM contratos WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir contrato:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
