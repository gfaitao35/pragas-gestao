import { NextRequest, NextResponse } from 'next/server'
import { sql, queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { randomUUID } from 'crypto'

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

    const meta = await queryOne`
      SELECT id, valor_meta, observacoes FROM metas_lucro WHERE user_id = ${userId} AND mes = ${mes}
    `

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

    // Upsert: atualizar se existir, inserir se nao
    const existing = await queryOne<{ id: string }>`
      SELECT id FROM metas_lucro WHERE user_id = ${userId} AND mes = ${mes}
    `

    if (existing) {
      await sql`
        UPDATE metas_lucro SET valor_meta = ${valor_meta}, observacoes = ${observacoes || ''}, updated_at = NOW()
        WHERE id = ${existing.id}
      `
    } else {
      await sql`
        INSERT INTO metas_lucro (id, user_id, mes, valor_meta, observacoes) VALUES (${randomUUID()}, ${userId}, ${mes}, ${valor_meta}, ${observacoes || ''})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
