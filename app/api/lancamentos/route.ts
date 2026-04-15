import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const status = searchParams.get('status')
    const categoria_id = searchParams.get('categoria_id')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')

    // Neon suporta template literals condicionais via sql.unsafe para queries dinâmicas
    // Mas a forma mais simples e segura é construir com condições fixas usando CASE/COALESCE
    const lancamentos = await sql`
      SELECT
        l.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        ct.numero_contrato,
        ct.data_inicio,
        ct.data_fim,
        cl.razao_social,
        cl.nome_fantasia,
        cl.cnpj
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
      LEFT JOIN contratos ct ON l.referencia_tipo = 'contrato' AND l.referencia_id = ct.id
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE l.user_id = ${userId}
        AND (${tipo}::text IS NULL OR l.tipo = ${tipo})
        AND (${status}::text IS NULL OR l.status = ${status})
        AND (${categoria_id}::text IS NULL OR l.categoria_id = ${categoria_id})
        AND (${data_inicio}::text IS NULL OR l.data_lancamento >= ${data_inicio})
        AND (${data_fim}::text IS NULL OR l.data_lancamento <= ${data_fim})
      ORDER BY l.data_lancamento DESC
    `

    return NextResponse.json(lancamentos)
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, categoria_id, descricao, valor, data_lancamento, data_pagamento, status, forma_pagamento, referencia_tipo, referencia_id } = body

    if (!tipo || !descricao || !valor || !data_lancamento) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await sql`
      INSERT INTO lancamentos_financeiros (
        id, user_id, tipo, categoria_id, descricao, valor, data_lancamento,
        data_pagamento, status, forma_pagamento, referencia_tipo, referencia_id
      ) VALUES (
        ${id}, ${userId}, ${tipo},
        ${categoria_id || null},
        ${descricao}, ${valor}, ${data_lancamento},
        ${data_pagamento || null},
        ${status || 'pendente'},
        ${forma_pagamento || null},
        ${referencia_tipo || 'manual'},
        ${referencia_id || null}
      )
    `

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar lançamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
