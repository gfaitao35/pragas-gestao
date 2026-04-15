import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

const MODULE_TOKENS: Record<string, string> = {
  'laudos': 'Q9!f7X@2L#8$Z%3mA^6R*1K&0W',
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const [config] = await sql`
      SELECT modulos_liberados FROM empresa_config WHERE user_id = ${userId}
    `

    const liberados: string[] = JSON.parse(config?.modulos_liberados || '[]')
    return NextResponse.json({ modulos_liberados: liberados })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { modulo, token } = await request.json()

    if (!modulo || !token) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (MODULE_TOKENS[modulo] !== token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }

    // Garante que a config existe
    const [existing] = await sql`SELECT id FROM empresa_config WHERE user_id = ${userId}`
    if (!existing) {
      await sql`
        INSERT INTO empresa_config (id, user_id, modulos_liberados)
        VALUES (${crypto.randomUUID()}, ${userId}, '[]')
      `
    }

    const [config] = await sql`
      SELECT modulos_liberados FROM empresa_config WHERE user_id = ${userId}
    `

    const liberados: string[] = JSON.parse(config?.modulos_liberados || '[]')

    if (!liberados.includes(modulo)) {
      liberados.push(modulo)
      await sql`
        UPDATE empresa_config SET modulos_liberados = ${JSON.stringify(liberados)} WHERE user_id = ${userId}
      `
    }

    return NextResponse.json({ success: true, modulos_liberados: liberados })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
