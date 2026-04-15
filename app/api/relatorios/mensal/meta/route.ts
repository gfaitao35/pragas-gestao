import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { randomUUID } from 'crypto'

function ensureMetasTable(database: any) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS metas_lucro (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      valor_meta REAL NOT NULL,
      observacoes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, mes)
    )
  `)
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')

    if (!mes) {
      return NextResponse.json({ error: 'Parametro mes obrigatorio' }, { status: 400 })
    }

    const database = getDb()
    ensureMetasTable(database)

    const meta = database.prepare(`
      SELECT id, valor_meta, observacoes FROM metas_lucro WHERE user_id = ? AND mes = ?
    `).get(userId, mes)

    return NextResponse.json(meta || null)
  } catch (error) {
    console.error('Erro ao buscar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { mes, valor_meta, observacoes } = body

    if (!mes || valor_meta === undefined || valor_meta === null) {
      return NextResponse.json({ error: 'Campos obrigatorios: mes, valor_meta' }, { status: 400 })
    }

    const database = getDb()
    ensureMetasTable(database)

    // Upsert: atualizar se existir, inserir se nao
    const existing = database.prepare(`
      SELECT id FROM metas_lucro WHERE user_id = ? AND mes = ?
    `).get(userId, mes) as any

    if (existing) {
      database.prepare(`
        UPDATE metas_lucro SET valor_meta = ?, observacoes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(valor_meta, observacoes || '', existing.id)
    } else {
      database.prepare(`
        INSERT INTO metas_lucro (id, user_id, mes, valor_meta, observacoes) VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), userId, mes, valor_meta, observacoes || '')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
