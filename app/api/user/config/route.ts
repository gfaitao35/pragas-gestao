import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/session'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const [config] = await sql`SELECT * FROM empresa_config WHERE user_id = ${userId}`

    if (!config) {
      return NextResponse.json({
        responsavel_legal_nome: '',
        responsavel_legal_cargo: '',
        responsavel_legal_cpf: '',
        responsavel_tecnico_nome: '',
        responsavel_tecnico_registro: '',
        responsavel_tecnico_cargo: '',
        alvara_sanitario: '',
        alvara_licenca: '',
        certificado_registro: '',
        observacoes_padrao: 'Manter o ambiente arejado por pelo menos 2 horas apos a aplicacao.\nLavar loucas e utensilios que possam ter tido contato com o produto.\nManter criancas e animais domesticos afastados das areas tratadas.\nEm caso de contato com o produto, lavar a area afetada com agua corrente.\nEm caso de ingestao acidental, procurar atendimento medico imediatamente.',
        telefone: '',
        cor_sistema: '#ea580c',
        assinatura_legal_tipo: 'nenhuma',
        assinatura_legal_url: '',
        assinatura_tecnico_tipo: 'nenhuma',
        assinatura_tecnico_url: '',
        logo_url: '',
      })
    }

    return NextResponse.json({
      responsavel_legal_nome: config.responsavel_legal_nome || '',
      responsavel_legal_cargo: config.responsavel_legal_cargo || '',
      responsavel_legal_cpf: config.responsavel_legal_cpf || '',
      responsavel_tecnico_nome: config.responsavel_tecnico_nome || '',
      responsavel_tecnico_registro: config.responsavel_tecnico_registro || '',
      responsavel_tecnico_cargo: config.responsavel_tecnico_cargo || '',
      alvara_sanitario: config.alvara_sanitario || '',
      alvara_licenca: config.alvara_licenca || '',
      certificado_registro: config.certificado_registro || '',
      observacoes_padrao: config.observacoes_padrao || '',
      telefone: config.telefone || '',
      cor_sistema: config.cor_sistema || '#ea580c',
      assinatura_legal_tipo: config.assinatura_legal_tipo || 'nenhuma',
      assinatura_legal_url: config.assinatura_legal_url || '',
      assinatura_tecnico_tipo: config.assinatura_tecnico_tipo || 'nenhuma',
      assinatura_tecnico_url: config.assinatura_tecnico_url || '',
      logo_url: config.logo_url || '',
    })
  } catch (error) {
    console.error('[API /user/config] Erro GET:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()

    const [existing] = await sql`SELECT id FROM empresa_config WHERE user_id = ${userId}`

    if (existing) {
      await sql`
        UPDATE empresa_config SET
          responsavel_legal_nome = ${body.responsavel_legal_nome || ''},
          responsavel_legal_cargo = ${body.responsavel_legal_cargo || ''},
          responsavel_legal_cpf = ${body.responsavel_legal_cpf || ''},
          responsavel_tecnico_nome = ${body.responsavel_tecnico_nome || ''},
          responsavel_tecnico_registro = ${body.responsavel_tecnico_registro || ''},
          responsavel_tecnico_cargo = ${body.responsavel_tecnico_cargo || ''},
          alvara_sanitario = ${body.alvara_sanitario || ''},
          alvara_licenca = ${body.alvara_licenca || ''},
          certificado_registro = ${body.certificado_registro || ''},
          observacoes_padrao = ${body.observacoes_padrao || ''},
          telefone = ${body.telefone || ''},
          cor_sistema = ${body.cor_sistema || '#ea580c'},
          assinatura_legal_tipo = ${body.assinatura_legal_tipo || 'nenhuma'},
          assinatura_legal_url = ${body.assinatura_legal_url || ''},
          assinatura_tecnico_tipo = ${body.assinatura_tecnico_tipo || 'nenhuma'},
          assinatura_tecnico_url = ${body.assinatura_tecnico_url || ''},
          logo_url = ${body.logo_url || ''},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `
    } else {
      await sql`
        INSERT INTO empresa_config (
          id, user_id,
          responsavel_legal_nome, responsavel_legal_cargo, responsavel_legal_cpf,
          responsavel_tecnico_nome, responsavel_tecnico_registro, responsavel_tecnico_cargo,
          alvara_sanitario, alvara_licenca, certificado_registro,
          observacoes_padrao, telefone, cor_sistema,
          assinatura_legal_tipo, assinatura_legal_url,
          assinatura_tecnico_tipo, assinatura_tecnico_url,
          logo_url
        ) VALUES (
          ${crypto.randomUUID()}, ${userId},
          ${body.responsavel_legal_nome || ''},
          ${body.responsavel_legal_cargo || ''},
          ${body.responsavel_legal_cpf || ''},
          ${body.responsavel_tecnico_nome || ''},
          ${body.responsavel_tecnico_registro || ''},
          ${body.responsavel_tecnico_cargo || ''},
          ${body.alvara_sanitario || ''},
          ${body.alvara_licenca || ''},
          ${body.certificado_registro || ''},
          ${body.observacoes_padrao || ''},
          ${body.telefone || ''},
          ${body.cor_sistema || '#ea580c'},
          ${body.assinatura_legal_tipo || 'nenhuma'},
          ${body.assinatura_legal_url || ''},
          ${body.assinatura_tecnico_tipo || 'nenhuma'},
          ${body.assinatura_tecnico_url || ''},
          ${body.logo_url || ''}
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API /user/config] Erro PUT:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
