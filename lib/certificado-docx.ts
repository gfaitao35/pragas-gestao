/**
 * Gera o Certificado de Execução de Serviço como arquivo .docx
 * Usa a biblioteca 'docx' — funciona em browser e Node.js
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, HeadingLevel,
  ShadingType, convertInchesToTwip, ImageRun, PageOrientation,
} from 'docx'
import type { Certificado } from './types'
import { formatDateBRFromYYYYMMDD } from './utils'

interface EmpresaData {
  nomeFantasia: string; razaoSocial: string; cnpj: string; email: string
  logradouro: string; numero: string; bairro: string; cidade: string; estado: string; cep: string
}
interface EmpresaConfig {
  responsavel_legal_nome: string; responsavel_legal_cargo: string; responsavel_legal_cpf: string
  responsavel_tecnico_nome: string; responsavel_tecnico_registro: string; responsavel_tecnico_cargo: string
  alvara_sanitario: string; alvara_licenca: string; certificado_registro: string
  observacoes_padrao: string; telefone: string
}
interface TemplateStyle {
  nome_empresa: string; logo_url: string; cor_primaria: string; texto_rodape: string
}

async function fetchEmpresa(): Promise<EmpresaData> {
  try { const r = await fetch('/api/user/empresa'); if (r.ok) return r.json() } catch {}
  return { nomeFantasia: '', razaoSocial: '', cnpj: '', email: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }
}
async function fetchConfig(): Promise<EmpresaConfig> {
  try { const r = await fetch('/api/user/config'); if (r.ok) return r.json() } catch {}
  return { responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '', responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '', alvara_sanitario: '', alvara_licenca: '', certificado_registro: '', observacoes_padrao: '', telefone: '' }
}
async function fetchTemplate(): Promise<TemplateStyle> {
  try { const r = await fetch('/api/templates?tipo=os'); if (r.ok) return r.json() } catch {}
  return { nome_empresa: '', logo_url: '', cor_primaria: '#1e40af', texto_rodape: '' }
}
async function fetchServicos(): Promise<{ nome: string; observacoes_certificado?: string }[]> {
  try { const r = await fetch('/api/servicos'); if (r.ok) return r.json() } catch {}
  return []
}

function formatCNPJ(v: string) {
  const n = (v || '').replace(/\D/g, '')
  return n.length === 14 ? n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : v
}
function formatTel(v: string) {
  const n = (v || '').replace(/\D/g, '')
  if (n.length === 11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return v
}
function calcGarantia(emissao: string, validade: string) {
  try {
    const diff = new Date(validade).getTime() - new Date(emissao).getTime()
    const meses = Math.round(diff / (1000 * 60 * 60 * 24 * 30))
    const ext: Record<number, string> = { 1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',18:'dezoito',24:'vinte e quatro' }
    return ext[meses] ? `${String(meses).padStart(2,'0')} (${ext[meses]})` : String(meses)
  } catch { return '06 (seis)' }
}

function p(text: string, opts: { bold?: boolean; size?: number; center?: boolean; color?: string; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacing ?? 120 },
    children: [new TextRun({
      text,
      bold: opts.bold ?? false,
      size: (opts.size ?? 11) * 2,
      color: opts.color?.replace('#', '') ?? '1a1a1a',
      font: 'Arial',
    })],
  })
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333' } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, font: 'Arial', color: '1a1a1a' })],
  })
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 80 }, children: [] })
}

function sigTable(legal: { nome: string; cargo: string; cpf: string }, tecnico: { nome: string; cargo: string; registro: string }) {
  const cell = (lines: string[]) => new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333' }, bottom: BorderStyle.NONE as any, left: BorderStyle.NONE as any, right: BorderStyle.NONE as any },
    margins: { top: 200 },
    children: lines.map((l, i) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: l, bold: i === 0, size: i === 0 ? 20 : 16, font: 'Arial' })],
    })),
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: BorderStyle.NONE as any, bottom: BorderStyle.NONE as any, left: BorderStyle.NONE as any, right: BorderStyle.NONE as any, insideH: BorderStyle.NONE as any, insideV: BorderStyle.NONE as any },
    rows: [new TableRow({ children: [
      cell([legal.nome || 'Responsável Legal', legal.cargo || 'Responsável Legal', legal.cpf ? `CPF: ${legal.cpf}` : '']),
      cell([tecnico.nome || 'Responsável Técnico', tecnico.cargo || 'Responsável Técnico', tecnico.registro ? `Nº Registro: ${tecnico.registro}` : '']),
    ]})],
  })
}

export async function generateCertificadoDocx(certificado: Certificado): Promise<void> {
  const [emp, cfg, tmpl, servicos] = await Promise.all([fetchEmpresa(), fetchConfig(), fetchTemplate(), fetchServicos()])

  const ordem = certificado.ordem_servico as any
  const cliente = ordem?.cliente
  const nomeEmpresa = emp.nomeFantasia || tmpl.nome_empresa || 'Empresa'
  const nomeCliente = cliente?.razao_social || '-'
  const tipoServico = ordem?.tipo_servico || '-'
  const numOS = ordem?.numero_os || '-'
  const garantia = calcGarantia(certificado.data_emissao, certificado.data_validade)
  const dataEmissao = formatDateBRFromYYYYMMDD(certificado.data_emissao, { day: '2-digit', month: 'long', year: 'numeric' })

  const endCliente = cliente?.endereco
    ? `${cliente.endereco}${cliente.cidade ? ' – no município de ' + cliente.cidade : ''}${cliente.estado ? ' - ' + cliente.estado : ''}`
    : null

  // Serviços com checkbox
  const tiposNomes = tipoServico.split(',').map((s: string) => s.trim().toLowerCase())
  const servicosMatch = servicos.filter(sv =>
    tiposNomes.some(n => n.includes(sv.nome.toLowerCase()) || sv.nome.toLowerCase().includes(n))
  )
  const obsServico = servicosMatch.map(sv => sv.observacoes_certificado).filter(Boolean).join('\n')

  // Structured data (produtos/diluições)
  const marker = '<!--STRUCTURED_DATA-->'
  let structured: { venenos: { titulo: string; items: string[] }[]; diluicoes: { titulo: string; items: string[] }[]; pragas_selecionadas?: string[] } | null = null
  let obsTexto = ''
  const certObs = certificado.observacoes || ''
  if (certObs.includes(marker)) {
    const parts = certObs.split(marker)
    obsTexto = parts[0].trim()
    try { structured = JSON.parse(parts[1]) } catch {}
  } else {
    obsTexto = certObs
  }
  const cuidados = (obsServico || obsTexto || cfg.observacoes_padrao || '').split('\n').filter(Boolean)

  // Linha de endereço da empresa
  const endEmp = [emp.logradouro, emp.numero, emp.bairro, emp.cidade, emp.estado].filter(Boolean).join(', ')
  const cnpjFmt = emp.cnpj ? formatCNPJ(emp.cnpj) : ''
  const telFmt = cfg.telefone ? formatTel(cfg.telefone) : ''

  const children: (Paragraph | Table)[] = []

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: nomeEmpresa.toUpperCase(), bold: true, size: 32, font: 'Arial', color: '1a1a1a' })],
  }))
  if (emp.razaoSocial || cnpjFmt) {
    children.push(p(`${emp.razaoSocial}${cnpjFmt ? ' | CNPJ: ' + cnpjFmt : ''}`, { center: true, size: 9, color: '#555555' }))
  }
  if (endEmp) children.push(p(`${endEmp}${telFmt ? ' | Tel: ' + telFmt : ''}${emp.email ? ' | ' + emp.email : ''}`, { center: true, size: 9, color: '#555555' }))

  children.push(new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1a1a1a' } },
    children: [],
  }))

  // ── TÍTULO ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text: 'CERTIFICADO DE EXECUÇÃO DE SERVIÇO', bold: true, size: 36, font: 'Arial' })],
  }))
  children.push(p('Controle Integrado de Pragas Urbanas', { center: true, size: 9, color: '#666666' }))
  children.push(p(`Certificado Nº ${certificado.numero_certificado}`, { center: true, size: 11, bold: true }))
  children.push(emptyLine())

  // ── TEXTO PRINCIPAL ────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 },
    shading: { type: ShadingType.CLEAR, fill: 'fafafa' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'dddddd' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'dddddd' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'dddddd' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'dddddd' },
    },
    children: [
      new TextRun({ text: 'O presente certificado é emitido pela ', size: 22, font: 'Arial' }),
      new TextRun({ text: nomeEmpresa.toUpperCase(), bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: ', registrada na Vigilância Sanitária e Órgãos competentes, em favor de ', size: 22, font: 'Arial' }),
      new TextRun({ text: nomeCliente, bold: true, size: 22, font: 'Arial' }),
      ...(endCliente ? [new TextRun({ text: `, localizado(a) em ${endCliente}`, size: 22, font: 'Arial' })] : []),
      new TextRun({ text: ', referente à execução dos serviços de ', size: 22, font: 'Arial' }),
      new TextRun({ text: tipoServico, bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: ', conforme O.S Nº ', size: 22, font: 'Arial' }),
      new TextRun({ text: numOS, bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: ', com garantia de ', size: 22, font: 'Arial' }),
      new TextRun({ text: `${garantia} meses`, bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: `, a partir da emissão deste certificado em `, size: 22, font: 'Arial' }),
      new TextRun({ text: dataEmissao, bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: '.', size: 22, font: 'Arial' }),
    ],
  }))

  // ── SERVIÇOS REALIZADOS ────────────────────────────────────────────────────
  if (servicosMatch.length > 0) {
    children.push(sectionTitle('Serviços Realizados'))
    for (const sv of servicosMatch) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: '☑ ', bold: true, size: 20, font: 'Arial' }),
          new TextRun({ text: sv.nome, size: 20, font: 'Arial' }),
        ],
      }))
    }
  }

  // ── PRAGAS ALVO ───────────────────────────────────────────────────────────
  if (structured?.pragas_selecionadas && structured.pragas_selecionadas.length > 0) {
    children.push(sectionTitle('Praga(s) Alvo Tratada(s)'))
    for (const praga of structured.pragas_selecionadas) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: '☑ ', bold: true, size: 20, font: 'Arial' }),
          new TextRun({ text: praga, size: 20, font: 'Arial' }),
        ],
      }))
    }
  }

  // ── OBSERVAÇÕES ────────────────────────────────────────────────────────────
  if (cuidados.length > 0) {
    children.push(sectionTitle('Observações e Cuidados Especiais'))
    for (const linha of cuidados) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        bullet: { level: 0 },
        children: [new TextRun({ text: linha.trim(), size: 20, font: 'Arial' })],
      }))
    }
    children.push(new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: '⚠ EM CASO DE INTOXICAÇÃO, LIGUE: 0800-643-5252', bold: true, size: 18, color: '7a3800', font: 'Arial' })],
    }))
  }

  // ── PRODUTOS ───────────────────────────────────────────────────────────────
  if (structured) {
    children.push(sectionTitle('Produtos e Dosagens Aplicadas'))
    const allVenenos = structured.venenos.flatMap(g => [`${g.titulo}:`, ...g.items])
    const allDiluicoes = structured.diluicoes.flatMap(g => [`${g.titulo}:`, ...g.items])
    const maxRows = Math.max(allVenenos.length, allDiluicoes.length)
    const rows = Array.from({ length: maxRows }, (_, i) =>
      new TableRow({ children: [
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: allVenenos[i] || '', size: 18, font: 'Courier New', bold: (allVenenos[i] || '').endsWith(':') })] })] }),
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: allDiluicoes[i] || '', size: 18, font: 'Courier New', bold: (allDiluicoes[i] || '').endsWith(':') })] })] }),
      ]})
    )
    if (rows.length > 0) {
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
    }
  }

  // ── ASSINATURAS ────────────────────────────────────────────────────────────
  children.push(emptyLine())
  children.push(emptyLine())
  children.push(sigTable(
    { nome: cfg.responsavel_legal_nome, cargo: cfg.responsavel_legal_cargo, cpf: cfg.responsavel_legal_cpf },
    { nome: cfg.responsavel_tecnico_nome, cargo: cfg.responsavel_tecnico_cargo, registro: cfg.responsavel_tecnico_registro },
  ))

  // ── RODAPÉ ─────────────────────────────────────────────────────────────────
  children.push(emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'cccccc' } },
    children: [new TextRun({ text: 'Centro de Informações Toxicológicas: 0800-643-5252', bold: true, size: 16, font: 'Arial', color: '777777' })],
  }))
  const alvaras = [
    cfg.alvara_sanitario ? `Alvará Sanitário Nº ${cfg.alvara_sanitario}` : '',
    cfg.alvara_licenca ? `Alvará de Licença Nº ${cfg.alvara_licenca}` : '',
    cfg.certificado_registro ? `Cert. de Registro Nº ${cfg.certificado_registro}` : '',
  ].filter(Boolean)
  if (alvaras.length > 0) {
    children.push(p(alvaras.join('  |  '), { center: true, size: 8, color: '#777777' }))
  }

  // ── GERAR DOCUMENTO ────────────────────────────────────────────────────────
  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `certificado-${certificado.numero_certificado || Date.now()}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
