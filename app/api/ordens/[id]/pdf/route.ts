import { getSessionUserId } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { OrdemServico, Cliente } from '@/lib/types'
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

function getTemplate(db: any): TemplateStyle {
  try {
    const t = db.prepare('SELECT * FROM document_templates WHERE tipo = ?').get('os')
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

function generateOsHtml(ordem: any, template: TemplateStyle): string {
  const cliente = ordem?.cliente || {}
  
  const formatDate = (d: string) => {
    if (!d) return '-'
    return formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: 'long', year: 'numeric' })
  }
  
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
  
  const statusLabel: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
  }

  const borderStyle = template.mostrar_borda
    ? `border: ${template.estilo_borda === 'double' ? '3px' : '2px'} ${template.estilo_borda} ${template.cor_primaria}; padding: 30px;`
    : 'padding: 30px;'

  // Logo alignment based on position
  const logoAlignment = {
    'left': 'flex-start',
    'center': 'center',
    'right': 'flex-end'
  }[template.logo_position || 'center'] || 'center'

  const logoSize = Math.min(Math.max(template.logo_size || 100, 20), 200) // Clamp between 20% and 200%

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OS ${ordem?.numero_os}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${template.fonte_familia};
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
          font-size: ${template.fonte_tamanho}px;
          color: ${template.cor_texto};
          background: white;
        }
        .document {
          ${borderStyle}
          font-family: ${template.fonte_familia};
          color: ${template.cor_texto};
          background: white;
        }
        .logo-container {
          display: flex;
          justify-content: ${logoAlignment};
          margin-bottom: 16px;
        }
        .logo-container img {
          max-height: ${logoSize * 0.5}px;
          object-fit: contain;
        }
        .header-text {
          text-align: center;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 22px;
          font-weight: bold;
          color: ${template.cor_primaria};
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .company-subtitle {
          font-size: 12px;
          color: ${template.cor_primaria};
          margin-top: 2px;
        }
        .divider {
          height: 2px;
          background: linear-gradient(to right, transparent, ${template.cor_primaria}, transparent);
          margin: 16px 0;
        }
        .os-number {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: ${template.cor_primaria};
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          color: ${template.cor_primaria};
          margin: 12px 0 6px;
          padding-bottom: 3px;
          border-bottom: 1px solid #e2e8f0;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
          margin: 8px 0;
        }
        .grid-full {
          grid-column: span 2;
        }
        .label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
        }
        .value {
          margin-top: 2px;
          font-size: 13px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
        }
        .signature-line {
          width: 200px;
          border-top: 1px solid ${template.cor_texto};
          margin: 0 auto 6px;
        }
        .signature-name {
          font-size: 12px;
          font-weight: 500;
        }
        .signature-role {
          font-size: 11px;
          color: #64748b;
        }
        .rodape {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        @media print {
          body { padding: 0; }
          .document { border: 1px solid ${template.cor_primaria}; }
        }
      </style>
    </head>
    <body>
      <div class="document">
        ${template.logo_url ? `<div class="logo-container"><img src="${template.logo_url}" alt="Logo" crossorigin="anonymous" /></div>` : ''}
        <div class="header-text">
          <div class="company-name">${template.nome_empresa}</div>
          <div class="company-subtitle">${template.subtitulo_empresa}</div>
        </div>
        <div class="divider"></div>
        <div class="os-number">${ordem?.numero_os || 'OS-000000'}</div>

        <div class="section-title">Dados do Cliente</div>
        <div class="grid">
          <div class="grid-full"><div class="label">Razão Social</div><div class="value">${cliente.razao_social || '-'}</div></div>
          <div><div class="label">CNPJ</div><div class="value">${formatCNPJ(cliente.cnpj || '')}</div></div>
          <div><div class="label">Telefone</div><div class="value">${cliente.telefone || '-'}</div></div>
        </div>

        <div class="section-title">Dados do Serviço</div>
        <div class="grid">
          <div><div class="label">Tipo de Serviço</div><div class="value">${ordem?.tipo_servico || '-'}</div></div>
          <div><div class="label">Data de Execução</div><div class="value">${formatDate(ordem?.data_execucao)}</div></div>
          <div><div class="label">Técnico</div><div class="value">${ordem?.tecnico_responsavel || '-'}</div></div>
          <div><div class="label">Valor</div><div class="value">${formatCurrency(ordem?.valor)}</div></div>
          <div class="grid-full"><div class="label">Descrição</div><div class="value">${ordem?.descricao_servico || '-'}</div></div>
          ${ordem?.local_execucao ? `<div class="grid-full"><div class="label">Local de Execução</div><div class="value">${ordem.local_execucao}</div></div>` : ''}
          ${ordem?.area_tratada ? `<div class="grid-full"><div class="label">Área Tratada</div><div class="value">${ordem.area_tratada}</div></div>` : ''}
          ${ordem?.pragas_alvo ? `<div class="grid-full"><div class="label">Pragas Alvo</div><div class="value">${ordem.pragas_alvo}</div></div>` : ''}
          ${ordem?.produtos_aplicados ? `<div class="grid-full"><div class="label">Produtos Aplicados</div><div class="value">${ordem.produtos_aplicados}</div></div>` : ''}
          ${ordem?.equipamentos_utilizados ? `<div class="grid-full"><div class="label">Equipamentos Utilizados</div><div class="value">${ordem.equipamentos_utilizados}</div></div>` : ''}
          ${ordem?.observacoes ? `<div class="grid-full"><div class="label">Observações</div><div class="value">${ordem.observacoes}</div></div>` : ''}
        </div>

        <div class="footer">
          ${template.texto_assinatura ? `<p style="font-size: 11px; color: #64748b; margin-bottom: 16px;">${template.texto_assinatura}</p>` : ''}
          <div class="signature-line"></div>
          <div class="signature-name">${template.nome_assinatura}</div>
          <div class="signature-role">${template.cargo_assinatura}</div>
        </div>
        ${template.texto_rodape ? `<div class="rodape">${template.texto_rodape}</div>` : ''}
      </div>
    </body>
    </html>
  `

  return html
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

    const db = getDb()
    
    const ordem = db
      .prepare(
        `SELECT o.*, c.razao_social, c.cnpj, c.telefone, c.nome_fantasia, c.email, c.endereco, c.cidade, c.estado
         FROM ordens_servico o
         LEFT JOIN clientes c ON o.cliente_id = c.id
         WHERE o.id = ? AND o.user_id = ?`
      )
      .get(orderId, userId) as any

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
    const template = getTemplate(db)

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

    const addField = (label: string, value: string, x?: number, width?: number) => {
      const xPos = x || 40
      const fieldWidth = width || 250
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
      doc.text(label.toUpperCase(), xPos, doc.y, { width: fieldWidth })
      doc.fontSize(11).font('Helvetica').fillColor('#000000')
      doc.text(value, xPos, doc.y, { width: fieldWidth })
      doc.moveDown(0.5)
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
    addField('Razão Social', client.razao_social || '-')
    
    const twoCols = 250
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('CNPJ', 40, doc.y)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatCNPJ(client.cnpj || ''), 40, doc.y)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Telefone', 290, doc.y - 20)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(client.telefone || '-', 290, doc.y)
    doc.moveDown(1)

    // Service Section
    addSection('DADOS DO SERVIÇO')
    const currentY = doc.y
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Tipo de Serviço', 40, currentY)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.tipo_servico || '-', 40, doc.y)
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Data de Execução', 290, currentY)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatDate(ordem.data_execucao), 290, doc.y)
    doc.moveDown(1)

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Técnico Responsável', 40, doc.y)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.tecnico_responsavel || '-', 40, doc.y)
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Valor', 290, doc.y - 20)
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(formatCurrency(ordem.valor), 290, doc.y)
    doc.moveDown(1)

    if (ordem.descricao_servico) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Descrição', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.descricao_servico, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.local_execucao) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Local de Execução', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.local_execucao, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.area_tratada || ordem.pragas_alvo) {
      const y1 = doc.y
      if (ordem.area_tratada) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Área Tratada', 40, y1)
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.area_tratada, 40, doc.y, { width: 250 })
      }
      if (ordem.pragas_alvo) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Pragas Alvo', 290, y1)
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.pragas_alvo, 290, y1, { width: 250 })
      }
      doc.moveDown(1)
    }

    if (ordem.produtos_aplicados) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Produtos Aplicados', 40, doc.y)
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(ordem.produtos_aplicados, 40, doc.y, { width: 500 })
      doc.moveDown(0.5)
    }

    if (ordem.equipamentos_utilizados) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Equipamentos Utilizados', 40, doc.y)
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
