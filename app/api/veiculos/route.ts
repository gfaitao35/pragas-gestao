import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ativo = searchParams.get('ativo')

    const veiculos = await sql`
      SELECT * FROM veiculos 
      WHERE user_id = ${userId}
        AND (${ativo}::text IS NULL OR ativo = ${ativo === 'true'})
      ORDER BY created_at DESC
    `

    return NextResponse.json(veiculos)
  } catch (error) {
    console.error('Erro ao buscar veículos:', error)
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
    const { modelo, marca, placa, ano, cor, quilometragem, combustivel, renavam, chassi, observacoes } = body

    if (!modelo || !placa) {
      return NextResponse.json({ error: 'Modelo e placa são obrigatórios' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await sql`
      INSERT INTO veiculos (
        id, user_id, modelo, marca, placa, ano, cor, quilometragem, 
        combustivel, renavam, chassi, observacoes
      ) VALUES (
        ${id}, ${userId}, ${modelo}, ${marca || null}, ${placa}, 
        ${ano || null}, ${cor || null}, ${quilometragem || 0},
        ${combustivel || null}, ${renavam || null}, ${chassi || null}, ${observacoes || null}
      )
    `

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar veículo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
