import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    const database = getDb()

    if (tipo) {
      const template = database.prepare(
        'SELECT * FROM document_templates WHERE user_id = ? AND tipo = ? ORDER BY updated_at DESC LIMIT 1'
      ).get(userId, tipo)
      return NextResponse.json(template || null)
    }

    const templates = database.prepare(
      'SELECT * FROM document_templates WHERE user_id = ?'
    ).all(userId)

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

    const database = getDb()

    const existing = database.prepare(
      'SELECT id FROM document_templates WHERE user_id = ? AND tipo = ?'
    ).get(userId, tipo) as { id: string } | undefined

    if (existing) {
      database.prepare(`
        UPDATE document_templates SET
          nome_empresa = ?,
          subtitulo_empresa = ?,
          logo_url = ?,
          cor_primaria = ?,
          cor_secundaria = ?,
          cor_texto = ?,
          fonte_familia = ?,
          fonte_tamanho = ?,
          mostrar_borda = ?,
          estilo_borda = ?,
          texto_rodape = ?,
          texto_assinatura = ?,
          nome_assinatura = ?,
          cargo_assinatura = ?,
          campos_visiveis = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.nome_empresa || null,
        body.subtitulo_empresa || null,
        body.logo_url || null,
        body.cor_primaria || '#1e40af',
        body.cor_secundaria || '#3b82f6',
        body.cor_texto || '#1f2937',
        body.fonte_familia || 'Arial',
        body.fonte_tamanho || 12,
        body.mostrar_borda ? 1 : 0,
        body.estilo_borda || 'solid',
        body.texto_rodape || null,
        body.texto_assinatura || null,
        body.nome_assinatura || null,
        body.cargo_assinatura || null,
        body.campos_visiveis || '{}',
        existing.id
      )
      return NextResponse.json({ success: true, id: existing.id })
    } else {
      const id = crypto.randomUUID()
      database.prepare(`
        INSERT INTO document_templates (
          id, user_id, tipo, nome_empresa, subtitulo_empresa, logo_url,
          cor_primaria, cor_secundaria, cor_texto, fonte_familia, fonte_tamanho,
          mostrar_borda, estilo_borda, texto_rodape, texto_assinatura,
          nome_assinatura, cargo_assinatura, campos_visiveis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, userId, tipo,
        body.nome_empresa || null,
        body.subtitulo_empresa || null,
        body.logo_url || null,
        body.cor_primaria || '#1e40af',
        body.cor_secundaria || '#3b82f6',
        body.cor_texto || '#1f2937',
        body.fonte_familia || 'Arial',
        body.fonte_tamanho || 12,
        body.mostrar_borda ? 1 : 0,
        body.estilo_borda || 'solid',
        body.texto_rodape || null,
        body.texto_assinatura || null,
        body.nome_assinatura || null,
        body.cargo_assinatura || null,
        body.campos_visiveis || '{}'
      )
      return NextResponse.json({ success: true, id }, { status: 201 })
    }
  } catch (error) {
    console.error('Erro ao salvar template:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}