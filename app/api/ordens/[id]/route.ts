import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const rows = await sql`
      SELECT o.*,
             c.razao_social as cliente_razao_social,
             c.nome_fantasia as cliente_nome_fantasia,
             c.tipo_pessoa as cliente_tipo_pessoa,
             c.cnpj as cliente_cnpj,
             c.cpf as cliente_cpf,
             c.telefone as cliente_telefone,
             c.email as cliente_email,
             c.endereco as cliente_endereco,
             c.cidade as cliente_cidade,
             c.estado as cliente_estado
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.id = ${id} AND o.user_id = ${userId}
    `

    const ordem = rows[0]
    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      id: ordem.id,
      numero_os: ordem.numero_os,
      cliente_id: ordem.cliente_id,
      cliente: {
        razao_social: ordem.cliente_razao_social,
        nome_fantasia: ordem.cliente_nome_fantasia,
        tipo_pessoa: ordem.cliente_tipo_pessoa,
        cnpj: ordem.cliente_cnpj,
        cpf: ordem.cliente_cpf,
        telefone: ordem.cliente_telefone,
        email: ordem.cliente_email,
        endereco: ordem.cliente_endereco,
        cidade: ordem.cliente_cidade,
        estado: ordem.cliente_estado,
      },
      data_execucao: ordem.data_execucao,
      tipo_servico: ordem.tipo_servico,
      descricao_servico: ordem.descricao_servico,
      local_execucao: ordem.local_execucao,
      equipamentos_utilizados: ordem.equipamentos_utilizados,
      produtos_aplicados: ordem.produtos_aplicados,
      area_tratada: ordem.area_tratada,
      pragas_alvo: ordem.pragas_alvo,
      observacoes: ordem.observacoes,
      tecnico_responsavel: ordem.tecnico_responsavel,
      status: ordem.status,
      valor: ordem.valor,
      liquidado: ordem.liquidado === 1,
      data_liquidacao: ordem.data_liquidacao,
      valor_pago: ordem.valor_pago,
      garantia_meses: ordem.garantia_meses,
      visitas_gratuitas: ordem.visitas_gratuitas || 0,
      contrato_id: ordem.contrato_id,
      created_at: ordem.created_at,
      updated_at: ordem.updated_at,
      user_id: ordem.user_id,
    })
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    const statusValidos = ['pendente', 'em_andamento', 'concluida', 'cancelada']
    if (!status || !statusValidos.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const result = await sql`
      UPDATE ordens_servico
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
