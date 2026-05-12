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

    const veiculos = await sql`
      SELECT * FROM veiculos 
      WHERE id = ${id} AND user_id = ${userId}
    `

    if (veiculos.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(veiculos[0])
  } catch (error) {
    console.error('Erro ao buscar veículo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { modelo, marca, placa, ano, cor, quilometragem, combustivel, renavam, chassi, observacoes, ativo } = body

    await sql`
      UPDATE veiculos SET
        modelo = ${modelo},
        marca = ${marca || null},
        placa = ${placa},
        ano = ${ano || null},
        cor = ${cor || null},
        quilometragem = ${quilometragem || 0},
        combustivel = ${combustivel || null},
        renavam = ${renavam || null},
        chassi = ${chassi || null},
        observacoes = ${observacoes || null},
        ativo = ${ativo !== undefined ? ativo : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    await sql`
      DELETE FROM veiculos 
      WHERE id = ${id} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar veículo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
