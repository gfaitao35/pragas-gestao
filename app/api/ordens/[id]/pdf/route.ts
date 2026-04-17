import { getSessionUserId } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'
// @ts-ignore
import PDFDocument from 'pdfkit'

interface TemplateStyle {
  nome_empresa: string
  subtitulo_empresa: string
  logo_url: string
  cor_primaria: string
  cor_secundaria: string
  cor_texto: string
  fonte_familia: string
  fonte_tamanho: number
  mostrar_borda: boolean
  estilo_borda: string
  texto_rodape: string
  texto_assinatura: string
  nome_assinatura: string
  cargo_assinatura: string
  logo_position?: string
  logo_size?: number
}

const defaultStyle: TemplateStyle = {
  nome_empresa: 'Ordem de Servico',
  subtitulo_empresa: 'Controle de Servicos e Execucao',
  logo_url: '',
  cor_primaria: '#ea580c',
  cor_secundaria: '#f97316',
  cor_texto: '#1f2937',
  fonte_familia: "'Times New Roman', Times, serif",
  fonte_tamanho: 12,
  mostrar_borda: true,
  estilo_borda: 'solid',
  texto_rodape: '',
  texto_assinatura: '',
  nome_assinatura: 'Responsavel pelo Servico',
  cargo_assinatura: 'Controle de Pragas',
  logo_position: 'center',
  logo_size: 100
}

async function getTemplate(): Promise<TemplateStyle> {
  try {
    const t = await queryOne<any>`SELECT * FROM document_templates WHERE tipo = 'os'`
    if (t) {
      let extras = {}
      try {
        if (t.campos_visiveis) {
          extras = typeof t.campos_visiveis === 'string' ? JSON.parse(t.campos_visiveis) : t.campos_visiveis
        }
      } catch (e) {
        extras = {}
      }
      return {
        nome_empresa: t.nome_empresa || defaultStyle.nome_empresa,
        subtitulo_empresa: t.subtitulo_empresa || defaultStyle.subtitulo_empresa,
        logo_url: t.logo_url || '',
        cor_primaria: t.cor_primaria || defaultStyle.cor_primaria,
        cor_secundaria: t.cor_secundaria || defaultStyle.cor_secundaria,
        cor_texto: t.cor_texto || defaultStyle.cor_texto,
        fonte_familia: t.fonte_familia ? `'${t.fonte_familia}', serif` : defaultStyle.fonte_familia,
        fonte_tamanho: t.fonte_tamanho || defaultStyle.fonte_tamanho,
        mostrar_borda: t.mostrar_borda === 1 || t.mostrar_borda === true,
        estilo_borda: t.estilo_borda || defaultStyle.estilo_borda,
        texto_rodape: t.texto_rodape || '',
        texto_assinatura: t.texto_assinatura || '',
        nome_assinatura: t.nome_assinatura || defaultStyle.nome_assinatura,
        cargo_assinatura: t.cargo_assinatura || defaultStyle.cargo_assinatura,
        logo_position: (extras as any)?.logo_position || 'center',
        logo_size: (extras as any)?.logo_size || 100
      }
    }
  } catch (e) {
    console.error('Error fetching template:', e)
  }
  return defaultStyle
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params
    const orderId = id

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const ordem = await queryOne<any>`
      SELECT o.*, c.razao_social, c.cnpj, c.telefone, c.nome_fantasia, c.email, c.endereco, c.cidade, c.estado
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.id = ${orderId} AND o.user_id = ${userId}
    `

    if (!ordem) {
      return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 })
    }

    // Format order for compatibility
    const formattedOrdem = {
      ...ordem,
      cliente: {
        razao_social: ordem.razao_social,
        cnpj: ordem.cnpj,
        telefone: ordem.telefone,
        nome_fantasia: ordem.nome_fantasia,
        email: ordem.email,
        endereco: ordem.endereco,
        cidade: ordem.cidade,
        estado: ordem.estado
      }
    }

    // Get template
    const template = await getTemplate()

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true
    })

    // Create buffer to collect PDF data
    const chunks: Uint8Array[] = []
    
    doc.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk)
    })

    // Helper functions
    const formatDate = (d: string) => formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: 'long', year: 'numeric' })
    
    const formatCNPJ = (cnpj: string) => {
      if (!cnpj) return '-'
      const n = cnpj.replace(/\D/g, '')
      if (n.length !== 14) return cnpj
      return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    }
    
    const formatCurrency = (value: number | null) => {
      if (value == null) return '-'
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const addSection = (title: string, y?: number) => {
      const currentY = y || doc.y
      doc.fontSize(12).font('Helvetica-Bold').fillColor(template.cor_primaria)
      doc.text(title, 40, currentY)
      doc.moveDown(0.3)
      doc.strokeColor(template.cor_primaria).lineWidth(1)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
      doc.moveDown(0.3)
      doc.fillColor('#000000')
    }

    // Start building PDF
    doc.fontSize(24).font('Helvetica-Bold').fillColor(template.cor_primaria)
    doc.text(template.nome_empresa, 40, 40, { align: 'center' })
    doc.fontSize(12).font('Helvetica').fillColor(template.cor_primaria)
    doc.text(template.subtitulo_empresa, 40, doc.y, { align: 'center' })
    doc.moveDown(1)

    // OS Number
    doc.fontSize(16).font('Helvetica-Bold').fillColor(template.cor_primaria).text(`OS ${ordem.numero_os}`, 40, doc.y, { align: 'center' })
    doc.moveDown(1)

    // Client Section
    addSection('DADOS DO CLIENTE')
    const client = formattedOrdem.cliente
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('RAZÃO SOCIAL', 40, doc.y)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(client.razao_social || '-', 40, doc.y)
    doc.moveDown(0.5)
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('CNPJ', 40, doc.y)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatCNPJ(client.cnpj || ''), 40, doc.y)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('TELEFONE', 290, doc.y - 20)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(client.telefone || '-', 290, doc.y)
    doc.moveDown(1)

    // Service Section
    addSection('DADOS DO SERVIÇO')
    const currentY = doc.y
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('TIPO DE SERVIÇO', 40, currentY)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.tipo_servico || '-', 40, doc.y)
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('DATA DE EXECUÇÃO', 290, currentY)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatDate(ordem.data_execucao), 290, doc.y)
    doc.moveDown(1)

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('TÉCNICO RESPONSÁVEL', 40, doc.y)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.tecnico_responsavel || '-', 40, doc.y)
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('VALOR', 290, doc.y - 20)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatCurrency(ordem.valor), 290, doc.y)
    doc.moveDown(1)

    if (ordem.descricao_servico) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('DESCRIÇÃO', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.descricao_servico, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.local_execucao) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('LOCAL DE EXECUÇÃO', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.local_execucao, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.area_tratada || ordem.pragas_alvo) {
      const y1 = doc.y
      if (ordem.area_tratada) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('ÁREA TRATADA', 40, y1)
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.area_tratada, 40, doc.y, { width: 250 })
      }
      if (ordem.pragas_alvo) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('PRAGAS ALVO', 290, y1)
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.pragas_alvo, 290, y1, { width: 250 })
      }
      doc.moveDown(1)
    }

    if (ordem.produtos_aplicados) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('PRODUTOS APLICADOS', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.produtos_aplicados, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.equipamentos_utilizados) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('EQUIPAMENTOS UTILIZADOS', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.equipamentos_utilizados, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    // Signature section
    doc.moveDown(1)
    if (template.texto_assinatura) {
      doc.fontSize(10).fillColor('#64748b').text(template.texto_assinatura, 40, doc.y, { align: 'center' })
      doc.moveDown(1)
    }

    doc.moveTo(200, doc.y).lineTo(400, doc.y).stroke()
    doc.moveDown(0.2)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(template.nome_assinatura, 40, doc.y, { align: 'center' })
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(template.cargo_assinatura, 40, doc.y, { align: 'center' })

    if (template.texto_rodape) {
      doc.moveDown(2)
      doc.fontSize(9).fillColor('#94a3b8').text(template.texto_rodape, 40, doc.y, { align: 'center', width: 500 })
    }

    // Finalize PDF
    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="OS-${ordem.numero_os}.pdf"`,
              'Content-Length': pdfBuffer.length.toString()
            }
          })
        )
      })
    })
  } catch (error) {
    console.error('[API PDF Ordens]', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
