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

    const [laudo] = await sql`
      SELECT l.*,
             o.numero_os, o.tipo_servico, o.data_execucao,
             o.local_execucao, o.pragas_alvo, o.area_tratada,
             o.tecnico_responsavel, o.produtos_aplicados,
             c.razao_social as cliente_nome,
             c.tipo_pessoa as cliente_tipo_pessoa,
             c.cnpj as cliente_cnpj,
             c.cpf as cliente_cpf,
             c.endereco as cliente_endereco,
             c.cidade as cliente_cidade,
             c.estado as cliente_estado,
             c.telefone as cliente_telefone
      FROM laudos l
      LEFT JOIN ordens_servico o ON l.ordem_servico_id = o.id
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE l.id = ${id} AND l.user_id = ${userId}
    `

    if (!laudo) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    return NextResponse.json({
      ...laudo,
      imagens: JSON.parse(laudo.imagens || '[]'),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { texto, imagens } = body

    const result = await sql`
      UPDATE laudos SET texto = ${texto}, imagens = ${JSON.stringify(imagens || [])}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `

    if (result.length === 0) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const result = await sql`
      DELETE FROM laudos WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `
    if (result.length === 0) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
