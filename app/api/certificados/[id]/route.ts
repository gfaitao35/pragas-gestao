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

    const [certificado] = await sql`
      SELECT c.*,
             o.numero_os as os_numero,
             o.tipo_servico as os_tipo_servico,
             o.data_execucao as os_data_execucao,
             o.tecnico_responsavel as os_tecnico,
             o.produtos_aplicados as os_produtos,
             o.area_tratada as os_area_tratada,
             o.pragas_alvo as os_pragas_alvo,
             cl.razao_social as cliente_razao_social,
             cl.nome_fantasia as cliente_nome_fantasia,
             cl.tipo_pessoa as cliente_tipo_pessoa,
             cl.cnpj as cliente_cnpj,
             cl.cpf as cliente_cpf,
             cl.endereco as cliente_endereco,
             cl.cidade as cliente_cidade,
             cl.estado as cliente_estado,
             cl.cep as cliente_cep,
             cl.telefone as cliente_telefone
      FROM certificados c
      LEFT JOIN ordens_servico o ON c.ordem_servico_id = o.id
      LEFT JOIN clientes cl ON o.cliente_id = cl.id
      WHERE c.id = ${id} AND c.user_id = ${userId}
    `

    if (!certificado) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: certificado.id,
      numero_certificado: certificado.numero_certificado,
      ordem_servico_id: certificado.ordem_servico_id,
      ordem_servico: {
        numero_os: certificado.os_numero,
        tipo_servico: certificado.os_tipo_servico,
        data_execucao: certificado.os_data_execucao,
        tecnico_responsavel: certificado.os_tecnico,
        produtos_aplicados: certificado.os_produtos,
        area_tratada: certificado.os_area_tratada,
        pragas_alvo: certificado.os_pragas_alvo,
        cliente: {
          razao_social: certificado.cliente_razao_social,
          nome_fantasia: certificado.cliente_nome_fantasia,
          tipo_pessoa: certificado.cliente_tipo_pessoa,
          cnpj: certificado.cliente_cnpj,
          cpf: certificado.cliente_cpf,
          endereco: certificado.cliente_endereco,
          cidade: certificado.cliente_cidade,
          estado: certificado.cliente_estado,
          cep: certificado.cliente_cep,
          telefone: certificado.cliente_telefone,
        },
      },
      data_emissao: certificado.data_emissao,
      data_validade: certificado.data_validade,
      tipo_certificado: certificado.tipo_certificado,
      observacoes: certificado.observacoes,
      created_at: certificado.created_at,
    })
  } catch (error) {
    console.error('Erro ao buscar certificado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
