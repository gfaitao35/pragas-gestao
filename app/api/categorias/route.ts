import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

const DEFAULT_CATEGORIAS = [
  { nome: 'Servico Avulso', tipo: 'receita', cor: '#22c55e' },
  { nome: 'Contrato Mensal', tipo: 'receita', cor: '#3b82f6' },
  { nome: 'Material/Insumos', tipo: 'despesa', cor: '#ef4444' },
  { nome: 'Combustivel', tipo: 'despesa', cor: '#f97316' },
  { nome: 'Aluguel', tipo: 'despesa', cor: '#8b5cf6' },
  { nome: 'Salarios', tipo: 'despesa', cor: '#ec4899' },
  { nome: 'Manutencao', tipo: 'despesa', cor: '#14b8a6' },
  { nome: 'Outros', tipo: 'despesa', cor: '#6b7280' },
]

async function ensureDefaultCategorias(userId: string) {
  const [{ count }] = await sql`
    SELECT COUNT(*) as count FROM categorias_financeiras WHERE user_id = ${userId}
  `
  if (Number(count) === 0) {
    for (const cat of DEFAULT_CATEGORIAS) {
      await sql`
        INSERT INTO categorias_financeiras (id, user_id, nome, tipo, cor)
        VALUES (${crypto.randomUUID()}, ${userId}, ${cat.nome}, ${cat.tipo}, ${cat.cor})
      `
    }
  }
}

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await ensureDefaultCategorias(userId)

    const categorias = await sql`
      SELECT * FROM categorias_financeiras WHERE user_id = ${userId} ORDER BY tipo, nome
    `

    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
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
    const { nome, tipo, cor } = body

    if (!nome || !tipo) {
      return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await sql`
      INSERT INTO categorias_financeiras (id, user_id, nome, tipo, cor)
      VALUES (${id}, ${userId}, ${nome}, ${tipo}, ${cor || '#6b7280'})
    `

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
