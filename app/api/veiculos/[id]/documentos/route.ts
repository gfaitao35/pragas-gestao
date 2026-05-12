import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const documentos = await sql`
      SELECT * FROM veiculo_documentos 
      WHERE veiculo_id = ${id} AND user_id = ${userId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(documentos)
  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: veiculoId } = await params
    const body = await request.json()
    const { tipo, nome, url, data_vencimento, observacoes } = body

    if (!tipo || !nome || !url) {
      return NextResponse.json({ error: 'Tipo, nome e URL são obrigatórios' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await sql`
      INSERT INTO veiculo_documentos (
        id, veiculo_id, user_id, tipo, nome, url, data_vencimento, observacoes
      ) VALUES (
        ${id}, ${veiculoId}, ${userId}, ${tipo}, ${nome}, ${url},
        ${data_vencimento || null}, ${observacoes || null}
      )
    `

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar documento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
