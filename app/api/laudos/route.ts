import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { generateId } from '@/lib/auth'

async function generateNumeroLaudo(userId: string): Promise<string> {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const prefixo = `LAUDO-${ano}-${mes}-`

  const [result] = await sql`
    SELECT numero_laudo FROM laudos
    WHERE user_id = ${userId} AND numero_laudo LIKE ${prefixo + '%'}
    ORDER BY numero_laudo DESC LIMIT 1
  `

  let seq = 1
  if (result) {
    const partes = result.numero_laudo.split('-')
    const ultimo = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(ultimo)) seq = ultimo + 1
  }
  return `${prefixo}${String(seq).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const laudos = await sql`
      SELECT l.*,
             o.numero_os, o.tipo_servico, o.data_execucao,
             c.razao_social as cliente_nome
      FROM laudos l
      LEFT JOIN ordens_servico o ON l.ordem_servico_id = o.id
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE l.user_id = ${userId}
      ORDER BY l.created_at DESC
    `

    return NextResponse.json(laudos)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { ordem_servico_id, texto, imagens } = body

    if (!ordem_servico_id || !texto) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const id = generateId()
    const numero_laudo = await generateNumeroLaudo(userId)

    await sql`
      INSERT INTO laudos (id, user_id, ordem_servico_id, numero_laudo, texto, imagens)
      VALUES (${id}, ${userId}, ${ordem_servico_id}, ${numero_laudo}, ${texto}, ${JSON.stringify(imagens || [])})
    `

    return NextResponse.json({ id, numero_laudo })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
