import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { generateId } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await context.params
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { nome, tipo, url, tamanho } = await request.json()
    if (!nome || !tipo || !url) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const id = generateId()
    await sql`
      INSERT INTO cliente_documentos (id, user_id, cliente_id, nome, tipo, url, tamanho)
      VALUES (${id}, ${userId}, ${clienteId}, ${nome}, ${tipo}, ${url}, ${tamanho || null})
    `

    return NextResponse.json({ id, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await context.params
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { docId } = await request.json()
    await sql`
      DELETE FROM cliente_documentos
      WHERE id = ${docId} AND cliente_id = ${clienteId} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
