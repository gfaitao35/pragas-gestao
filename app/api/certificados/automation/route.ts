import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const [config] = await sql`
      SELECT certificado_automation FROM empresa_config WHERE user_id = ${userId}
    `

    const automation = config?.certificado_automation
      ? JSON.parse(config.certificado_automation)
      : {}

    return NextResponse.json(automation)
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()

    const [existing] = await sql`
      SELECT id FROM empresa_config WHERE user_id = ${userId}
    `

    if (existing) {
      await sql`
        UPDATE empresa_config SET certificado_automation = ${JSON.stringify(body)} WHERE user_id = ${userId}
      `
    } else {
      await sql`
        INSERT INTO empresa_config (id, user_id, certificado_automation)
        VALUES (${crypto.randomUUID()}, ${userId}, ${JSON.stringify(body)})
      `
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
