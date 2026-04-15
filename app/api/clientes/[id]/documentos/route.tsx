import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

    const database = getDb()
    const id = generateId()
    database.prepare(`
      INSERT INTO cliente_documentos (id, user_id, cliente_id, nome, tipo, url, tamanho)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, clienteId, nome, tipo, url, tamanho || null)

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
    const database = getDb()
    database.prepare(
      'DELETE FROM cliente_documentos WHERE id = ? AND cliente_id = ? AND user_id = ?'
    ).run(docId, clienteId, userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}