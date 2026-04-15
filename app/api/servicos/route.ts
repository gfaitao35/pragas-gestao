import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { generateId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const servicos = await sql`
      SELECT * FROM servicos WHERE user_id = ${userId} AND ativo = 1 ORDER BY ordem, nome
    `

    return NextResponse.json(servicos)
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
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
    const { nome, descricao, descricao_orcamento, observacoes_certificado, pragas_alvo, praga_alvo_auto, ordem } = body

    if (!nome || !descricao) {
      return NextResponse.json({ error: 'Nome e descrição são obrigatórios' }, { status: 400 })
    }

    const id = generateId()
    await sql`
      INSERT INTO servicos (id, user_id, nome, descricao, descricao_orcamento, observacoes_certificado, pragas_alvo, praga_alvo_auto, ordem)
      VALUES (${id}, ${userId}, ${nome}, ${descricao}, ${descricao_orcamento || null}, ${observacoes_certificado || null}, ${pragas_alvo || null}, ${praga_alvo_auto ? 1 : 0}, ${ordem || 0})
    `

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, nome, descricao, descricao_orcamento, observacoes_certificado, pragas_alvo, praga_alvo_auto, ordem, ativo } = body

    if (!id || !nome || !descricao) {
      return NextResponse.json({ error: 'ID, nome e descrição são obrigatórios' }, { status: 400 })
    }

    const result = await sql`
      UPDATE servicos SET
        nome = ${nome},
        descricao = ${descricao},
        descricao_orcamento = ${descricao_orcamento || null},
        observacoes_certificado = ${observacoes_certificado || null},
        pragas_alvo = ${pragas_alvo || null},
        praga_alvo_auto = ${praga_alvo_auto ? 1 : 0},
        ordem = ${ordem || 0},
        ativo = ${ativo !== undefined ? (ativo ? 1 : 0) : 1},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM servicos WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir serviço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
