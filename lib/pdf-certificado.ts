/**
 * Gera o Certificado de Execução de Serviço como PDF
 * Layout conforme modelo visual fornecido
 */
import { openAsPdf } from './pdf-open'
import { formatDateBRFromYYYYMMDD } from './utils'
import { urlToBase64 } from './pdf-image-utils'
import type { Certificado } from './types'

const COR_BORDA_OLIVA = '#6b7c3f'
const COR_FUNDO_ALERTA = '#fff8dc'
const COR_TEXTO = '#333'
const FONTE = "'Arial', sans-serif"

interface EmpresaData {
  nomeFantasia: string; razaoSocial: string; cnpj: string; email: string
  nomeCompleto: string; logradouro: string; numero: string; bairro: string
  cidade: string; estado: string; cep: string
}

interface EmpresaConfig {
  responsavel_legal_nome: string; responsavel_legal_cargo: string; responsavel_legal_cpf: string
  responsavel_tecnico_nome: string; responsavel_tecnico_registro: string
  responsavel_tecnico_cargo: string; telefone: string
  assinatura_legal_tipo: string; assinatura_legal_url: string
  assinatura_tecnico_tipo: string; assinatura_tecnico_url: string
  alvara_sanitario: string; alvara_licenca: string; certificado_registro: string
  observacoes_padrao: string
}

interface TemplateStyle { nome_empresa: string; logo_url: string; subtitulo_empresa: string }

async function fetchTemplate(): Promise<TemplateStyle> {
  try {
    const res = await fetch('/api/templates?tipo=os')
    if (res.ok) { const t = await res.json(); if (t) return { nome_empresa: t.nome_empresa || '', logo_url: t.logo_url || '', subtitulo_empresa: t.subtitulo_empresa || '' } }
  } catch {}
  return { nome_empresa: '', logo_url: '', subtitulo_empresa: '' }
}

async function fetchEmpresaData(): Promise<EmpresaData> {
  try { const res = await fetch('/api/user/empresa'); if (res.ok) return await res.json() } catch {}
  return { nomeFantasia: '', razaoSocial: '', cnpj: '', email: '', nomeCompleto: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }
}

async function fetchEmpresaConfig(): Promise<EmpresaConfig> {
  try { const res = await fetch('/api/user/config'); if (res.ok) return await res.json() } catch {}
  return { responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '', responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '', telefone: '', assinatura_legal_tipo: 'nenhuma', assinatura_legal_url: '', assinatura_tecnico_tipo: 'nenhuma', assinatura_tecnico_url: '', alvara_sanitario: '', alvara_licenca: '', certificado_registro: '', observacoes_padrao: '' }
}

async function fetchServicos(): Promise<{ nome: string; observacoes_certificado?: string }[]> {
  try { const res = await fetch('/api/servicos'); if (res.ok) return await res.json() } catch {}
  return []
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return cnpj
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function calcGarantia(emissao: string, validade: string) {
  try {
    const diff = new Date(validade).getTime() - new Date(emissao).getTime()
    const meses = Math.round(diff / (1000 * 60 * 60 * 24 * 30))
    return { num: meses, ext: mesesPorExtenso(meses) }
  } catch { return { num: 6, ext: 'seis' } }
}

function mesesPorExtenso(m: number): string {
  const ext: Record<number, string> = { 1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',18:'dezoito',24:'vinte e quatro' }
  return ext[m] || String(m)
}

export async function generateCertificadoPDF(certificado: Certificado): Promise<void> {
  const [s, emp, cfg, servicos] = await Promise.all([
    fetchTemplate(),
    fetchEmpresaData(),
    fetchEmpresaConfig(),
    fetchServicos(),
  ])

  // Converter assinaturas para base64
  const [sigLegalB64, sigTecnicoB64] = await Promise.all([
    urlToBase64(cfg.assinatura_legal_url),
    urlToBase64(cfg.assinatura_tecnico_url),
  ])

  const ordem = certificado.ordem_servico as any
  const cliente = ordem?.cliente
  const nomeEmpresa = emp.nomeFantasia || s.nome_empresa || 'Empresa'
  const nomeCliente = cliente?.razao_social || '-'
  const tipoServico = ordem?.tipo_servico || '-'
  const numOS = ordem?.numero_os || '-'
  const garantia = calcGarantia(certificado.data_emissao, certificado.data_validade)
  const dataEmissao = formatDateBRFromYYYYMMDD(certificado.data_emissao, { day: '2-digit', month: 'long', year: 'numeric' })

  const endEmp = [emp.logradouro, emp.numero ? `N°${emp.numero}` : ''].filter(Boolean).join(', ')
  const bairroCidade = [emp.bairro ? `Bairro: ${emp.bairro.toUpperCase()}` : '', emp.cidade, emp.estado].filter(Boolean).join(' - ')

  const endCliente = cliente?.endereco
    ? `${cliente.endereco}${cliente.cidade ? ' – no município de ' + cliente.cidade : ''}${cliente.estado ? ' - ' + cliente.estado : ''}`
    : null

  // Serviços com checkbox
  const tiposNomes = tipoServico.split(',').map((s: string) => s.trim().toLowerCase())
  const servicosMatch = servicos.filter(sv =>
    tiposNomes.some((n: string) => n.includes(sv.nome.toLowerCase()) || sv.nome.toLowerCase().includes(n))
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

  // Assinaturas
  const sigLegalImg = cfg.assinatura_legal_tipo === 'fisica' && sigLegalB64
    ? `<img src="${sigLegalB64}" style="max-height:50px;max-width:120px;object-fit:contain;" />`
    : ''

  const sigTecnicoImg = cfg.assinatura_tecnico_tipo === 'fisica' && sigTecnicoB64
    ? `<img src="${sigTecnicoB64}" style="max-height:50px;max-width:120px;object-fit:contain;" />`
    : ''

  // Gerar HTML de produtos em duas colunas
  const produtosHTML = structured ? generateProdutosHTML(structured) : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Certificado ${certificado.numero_certificado}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${FONTE};font-size:11px;color:${COR_TEXTO};background:#fff;line-height:1.4}
  .page{padding:20px 28px;max-width:800px;margin:0 auto;border:1px solid #999;min-height:1100px;position:relative}

  /* CABEÇALHO */
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${COR_BORDA_OLIVA}}
  .header-left{font-size:9px;line-height:1.5}
  .header-left .fantasia{font-size:14px;font-weight:700;margin-bottom:2px}
  .header-right{text-align:right;border:1px solid #333;padding:6px 12px}
  .header-right .lbl{font-size:8px;color:#666;text-transform:uppercase}
  .header-right .num{font-size:12px;font-weight:700}

  /* TÍTULO */
  .title-section{text-align:center;margin-bottom:16px}
  .title-section h1{font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#333;margin-bottom:2px}
  .title-section h2{font-size:10px;color:#666;font-weight:400;text-transform:uppercase;letter-spacing:1px}

  /* TEXTO PRINCIPAL COM BORDA */
  .main-box{border-left:4px solid ${COR_BORDA_OLIVA};padding:12px 14px;margin-bottom:16px;background:#fafaf8;font-size:11px;line-height:1.7;text-align:justify}
  .main-box strong{font-weight:700}

  /* SEÇÕES */
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px 0;padding-bottom:3px;border-bottom:1px solid ${COR_BORDA_OLIVA}}

  /* CHECKBOX */
  .checkbox-item{display:flex;align-items:center;gap:6px;margin:4px 0;font-size:11px}
  .checkbox{width:12px;height:12px;border:1px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700}
  .checkbox.checked{background:#fff}

  /* LISTA DE CUIDADOS */
  .cuidados-list{margin:0;padding-left:18px}
  .cuidados-list li{margin:3px 0;font-size:10px}

  /* ALERTA */
  .warning-box{background:${COR_FUNDO_ALERTA};border:1px solid #d4a574;padding:6px 10px;margin:10px 0;font-size:10px;font-weight:600}
  .warning-box::before{content:"⚠ ";color:#b45309}

  /* PRODUTOS - DUAS COLUNAS */
  .produtos-section{margin:14px 0}
  .produtos-header{display:flex;border-bottom:2px solid ${COR_BORDA_OLIVA};padding-bottom:4px;margin-bottom:6px}
  .produtos-header span{flex:1;font-size:10px;font-weight:700}
  .produtos-content{display:flex}
  .produtos-col{flex:1;font-size:10px}
  .produtos-col .grupo-titulo{font-weight:700;margin:8px 0 4px 0}
  .produtos-col .item{margin:2px 0;font-family:'Courier New',monospace;font-size:9px}

  /* SEPARADOR */
  .separator{border-top:1px solid ${COR_BORDA_OLIVA};margin:20px 0}

  /* ASSINATURAS */
  .sig-section{display:flex;margin-top:auto;padding-top:20px}
  .sig-col{flex:1;text-align:center;padding:10px}
  .sig-col .sig-img{height:50px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px}
  .sig-col .sig-line{border-top:1px solid #333;width:70%;margin:0 auto 4px auto}
  .sig-col .sig-name{font-size:10px;font-weight:700}
  .sig-col .sig-cargo{font-size:9px;color:#666;font-style:italic}
  .sig-col .sig-doc{font-size:9px;color:#666}

  /* RODAPÉ */
  .footer{text-align:center;font-size:9px;color:#666;margin-top:16px;padding-top:8px;border-top:1px solid #ddd}

  @media print{
    .page{border:none;padding:15px 20px}
  }
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <div class="fantasia">${nomeEmpresa.toUpperCase()}</div>
      ${emp.razaoSocial ? `<div>${emp.razaoSocial.toUpperCase()} | CNPJ: ${formatCNPJ(emp.cnpj)}</div>` : ''}
      ${endEmp ? `<div>${endEmp.toUpperCase()} ${bairroCidade ? bairroCidade : ''}</div>` : ''}
      ${emp.email ? `<div>${emp.email}</div>` : ''}
    </div>
    <div class="header-right">
      <div class="lbl">Certificado N°</div>
      <div class="num">${certificado.numero_certificado}</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="title-section">
    <h1>Certificado de Execução de Serviço</h1>
    <h2>Controle Integrado de Pragas Urbanas</h2>
  </div>

  <!-- TEXTO PRINCIPAL -->
  <div class="main-box">
    O presente certificado é emitido pela <strong>${nomeEmpresa.toUpperCase()}</strong>, registrada na Vigilância Sanitária e Órgãos competentes, em favor de <strong>${nomeCliente}</strong>${endCliente ? `, localizado(a) em ${endCliente}` : ''}, referente à execução dos serviços de <strong>${tipoServico}</strong>, conforme O.S Nº <strong>${numOS}</strong>, com garantia de <strong>${garantia.num} (${garantia.ext}) meses</strong>, a partir da emissão deste certificado em <strong>${dataEmissao}</strong>.
  </div>

  <!-- SERVIÇOS REALIZADOS -->
  ${servicosMatch.length > 0 ? `
  <div class="section-title">Serviços Realizados</div>
  ${servicosMatch.map(sv => `<div class="checkbox-item"><span class="checkbox checked">✓</span> ${sv.nome}</div>`).join('')}
  ` : ''}

  <!-- OBSERVAÇÕES E CUIDADOS -->
  ${cuidados.length > 0 ? `
  <div class="section-title">Observações e Cuidados Especiais</div>
  <ul class="cuidados-list">
    ${cuidados.map(c => `<li>${c.trim()}</li>`).join('')}
  </ul>
  <div class="warning-box">EM CASO DE INTOXICAÇÃO, LIGUE: 0800-643-5252</div>
  ` : ''}

  <!-- PRODUTOS E DOSAGENS -->
  ${produtosHTML}

  <div class="separator"></div>

  <!-- ASSINATURAS -->
  <div class="sig-section">
    <div class="sig-col">
      <div class="sig-img">${sigLegalImg}</div>
      <div class="sig-line"></div>
      <div class="sig-name">${cfg.responsavel_legal_nome || 'Responsável Legal'}</div>
      <div class="sig-cargo">${cfg.responsavel_legal_cargo || 'Responsável Legal'}</div>
      ${cfg.responsavel_legal_cpf ? `<div class="sig-doc">CPF: ${cfg.responsavel_legal_cpf}</div>` : ''}
    </div>
    <div class="sig-col">
      <div class="sig-img">${sigTecnicoImg}</div>
      <div class="sig-line"></div>
      <div class="sig-name">${cfg.responsavel_tecnico_nome || 'Responsável Técnico'}</div>
      <div class="sig-cargo">${cfg.responsavel_tecnico_cargo || 'Responsável Técnico'}</div>
      ${cfg.responsavel_tecnico_registro ? `<div class="sig-doc">Nº Registro: ${cfg.responsavel_tecnico_registro}</div>` : ''}
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    Centro de Informações Toxicológicas: 0800-643-5252
  </div>

</div>
</body>
</html>`

  const pdfFilename = `certificado-${certificado.numero_certificado || Date.now()}.pdf`
  await openAsPdf(html, pdfFilename)
}

function generateProdutosHTML(structured: { venenos: { titulo: string; items: string[] }[]; diluicoes: { titulo: string; items: string[] }[] }): string {
  if (structured.venenos.length === 0 && structured.diluicoes.length === 0) return ''

  let leftCol = ''
  let rightCol = ''

  // Gerar coluna esquerda (Princípios Ativos)
  leftCol += '<div><strong>Princípios Ativos</strong></div>'
  for (const grupo of structured.venenos) {
    leftCol += `<div class="grupo-titulo">${grupo.titulo}</div>`
    for (const item of grupo.items) {
      // Verificar se item está marcado (começa com X ou tem [X])
      const marcado = item.startsWith('(X)') || item.startsWith('( X )') || item.includes('[X]')
      const textoLimpo = item.replace(/^\(?\s*X?\s*\)?\s*/, '').replace(/\[X\]/g, '').trim()
      leftCol += `<div class="item">( ${marcado ? 'X' : ' '} ) ${textoLimpo}</div>`
    }
  }

  // Gerar coluna direita (Diluições)
  rightCol += '<div><strong>Diluição / Iscagem</strong></div>'
  for (const grupo of structured.diluicoes) {
    rightCol += `<div class="grupo-titulo">${grupo.titulo}</div>`
    for (const item of grupo.items) {
      const marcado = item.startsWith('(X)') || item.startsWith('( X )') || item.includes('[X]')
      const textoLimpo = item.replace(/^\(?\s*X?\s*\)?\s*/, '').replace(/\[X\]/g, '').trim()
      rightCol += `<div class="item">( ${marcado ? 'X' : ' '} ) ${textoLimpo}</div>`
    }
  }

  return `
  <div class="section-title">Produtos e Dosagens Aplicadas</div>
  <div class="produtos-content">
    <div class="produtos-col">${leftCol}</div>
    <div class="produtos-col">${rightCol}</div>
  </div>`
}
