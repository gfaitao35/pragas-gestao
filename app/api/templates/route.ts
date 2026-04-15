import { NextRequest, NextResponse } from 'next/server'
import { sql, query, queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    if (tipo) {
      const template = await queryOne`
        SELECT * FROM document_templates WHERE user_id = ${userId} AND tipo = ${tipo} ORDER BY updated_at DESC LIMIT 1
      `
      return NextResponse.json(template || null)
    }

    const templates = await query`
      SELECT * FROM document_templates WHERE user_id = ${userId}
    `

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo } = body

    if (!tipo || !['os', 'certificado', 'orcamento'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido. Use: os, certificado ou orcamento' }, { status: 400 });
    }

    const existing = await queryOne<{ id: string }>`
      SELECT id FROM document_templates WHERE user_id = ${userId} AND tipo = ${tipo}
    `

    if (existing) {
      await sql`
        UPDATE document_templates SET
          nome_empresa = ${body.nome_empresa || null},
          subtitulo_empresa = ${body.subtitulo_empresa || null},
          logo_url = ${body.logo_url || null},
          cor_primaria = ${body.cor_primaria || '#1e40af'},
          cor_secundaria = ${body.cor_secundaria || '#3b82f6'},
          cor_texto = ${body.cor_texto || '#1f2937'},
          fonte_familia = ${body.fonte_familia || 'Arial'},
          fonte_tamanho = ${body.fonte_tamanho || 12},
          mostrar_borda = ${body.mostrar_borda ? 1 : 0},
          estilo_borda = ${body.estilo_borda || 'solid'},
          texto_rodape = ${body.texto_rodape || null},
          texto_assinatura = ${body.texto_assinatura || null},
          nome_assinatura = ${body.nome_assinatura || null},
          cargo_assinatura = ${body.cargo_assinatura || null},
          campos_visiveis = ${body.campos_visiveis || '{}'},
          updated_at = NOW()
        WHERE id = ${existing.id}
      `
      return NextResponse.json({ success: true, id: existing.id })
    } else {
      const id = crypto.randomUUID()
      await sql`
        INSERT INTO document_templates (
          id, user_id, tipo, nome_empresa, subtitulo_empresa, logo_url,
          cor_primaria, cor_secundaria, cor_texto, fonte_familia, fonte_tamanho,
          mostrar_borda, estilo_borda, texto_rodape, texto_assinatura,
          nome_assinatura, cargo_assinatura, campos_visiveis
        ) VALUES (
          ${id}, ${userId}, ${tipo},
          ${body.nome_empresa || null},
          ${body.subtitulo_empresa || null},
          ${body.logo_url || null},
          ${body.cor_primaria || '#1e40af'},
          ${body.cor_secundaria || '#3b82f6'},
          ${body.cor_texto || '#1f2937'},
          ${body.fonte_familia || 'Arial'},
          ${body.fonte_tamanho || 12},
          ${body.mostrar_borda ? 1 : 0},
          ${body.estilo_borda || 'solid'},
          ${body.texto_rodape || null},
          ${body.texto_assinatura || null},
          ${body.nome_assinatura || null},
          ${body.cargo_assinatura || null},
          ${body.campos_visiveis || '{}'}
        )
      `
      return NextResponse.json({ success: true, id }, { status: 201 })
    }
  } catch (error) {
    console.error('Erro ao salvar template:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
