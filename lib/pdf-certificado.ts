/**
 * Gera o Certificado de Execução de Serviço como PDF
 * Usa HTML + openAsPdf (igual aos demais PDFs do sistema)
 */
import { openAsPdf } from './pdf-open'
import { formatDateBRFromYYYYMMDD } from './utils'
import { urlToBase64 } from './pdf-image-utils'
import type { Certificado } from './types'

const COR_PRIMARIA = '#1e293b'
const COR_BORDA    = '#94a3b8'
const COR_TEXTO    = '#1e293b'
const FONTE        = "'Arial', sans-serif"

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

function formatTelefone(tel: string) {
  if (!tel) return ''
  const n = tel.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return tel
}

function calcGarantia(emissao: string, validade: string) {
  try {
    const diff = new Date(validade).getTime() - new Date(emissao).getTime()
    const meses = Math.round(diff / (1000 * 60 * 60 * 24 * 30))
    const ext: Record<number, string> = { 1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',18:'dezoito',24:'vinte e quatro' }
    return ext[meses] ? `${String(meses).padStart(2,'0')} (${ext[meses]})` : String(meses)
  } catch { return '06 (seis)' }
}

export async function generateCertificadoPDF(certificado: Certificado): Promise<void> {
  const [s, emp, cfg, servicos] = await Promise.all([
    fetchTemplate(),
    fetchEmpresaData(),
    fetchEmpresaConfig(),
    fetchServicos(),
  ])

  // Converter logo e assinaturas para base64
  const [logoB64, sigLegalB64, sigTecnicoB64] = await Promise.all([
    urlToBase64(s.logo_url),
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
  const dataEmissaoShort = formatDateBRFromYYYYMMDD(certificado.data_emissao, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const dataValidadeShort = formatDateBRFromYYYYMMDD(certificado.data_validade, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const endEmp = [
    emp.logradouro ? `${emp.logradouro}${emp.numero ? ', N°' + emp.numero : ''}` : '',
    emp.bairro ? `Bairro: ${emp.bairro}` : '',
    emp.cidade ? `${emp.cidade}${emp.estado ? ' - ' + emp.estado : ''}` : '',
  ].filter(Boolean).join(' ')

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
    ? `<img src="${sigLegalB64}" style="max-height:60px;max-width:150px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  const sigTecnicoImg = cfg.assinatura_tecnico_tipo === 'fisica' && sigTecnicoB64
    ? `<img src="${sigTecnicoB64}" style="max-height:60px;max-width:150px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  // Alvaras
  const alvaras = [
    cfg.alvara_sanitario ? `Alvará Sanitário Nº ${cfg.alvara_sanitario}` : '',
    cfg.alvara_licenca ? `Alvará de Licença Nº ${cfg.alvara_licenca}` : '',
    cfg.certificado_registro ? `Cert. de Registro Nº ${cfg.certificado_registro}` : '',
  ].filter(Boolean)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Certificado ${certificado.numero_certificado}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${FONTE};font-size:11px;color:${COR_TEXTO};background:#fff}
  .page{padding:18px 22px;max-width:820px;margin:0 auto}

  /* CABEÇALHO */
  .header{display:flex;align-items:flex-start;gap:14px;margin-bottom:12px}
  .header img.logo{max-height:80px;max-width:100px;object-fit:contain;flex-shrink:0}
  .header-info{flex:1;font-size:10px;line-height:1.6}
  .header-info .fantasia{font-size:13px;font-weight:700}
  .header-info .razao{font-size:11px;font-weight:600}

  /* TÍTULO */
  .title-bar{display:flex;align-items:stretch;border:2px solid ${COR_PRIMARIA};margin-bottom:0}
  .title-main{flex:1;padding:8px 12px}
  .title-main h1{font-size:18px;font-weight:900;color:${COR_PRIMARIA};text-transform:uppercase}
  .title-main h2{font-size:10px;color:#475569;font-weight:600}
  .title-num{background:${COR_PRIMARIA};color:#fff;padding:8px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:120px}
  .title-num .lbl{font-size:9px;text-transform:uppercase;opacity:.8}
  .title-num .num{font-size:13px;font-weight:900;letter-spacing:.5px;text-align:center}

  /* SEÇÕES */
  .section{border:1px solid ${COR_BORDA};border-top:none}
  .section-header{background:${COR_PRIMARIA};color:#fff;font-size:9px;font-weight:700;padding:3px 8px;text-transform:uppercase;letter-spacing:.7px}
  .row{display:flex;border-top:1px solid ${COR_BORDA}}
  .cell{padding:5px 8px;flex:1}
  .cell-label{font-weight:700;font-size:9px;text-transform:uppercase;color:#64748b;display:block;margin-bottom:1px}
  .cell-val{font-size:11px}
  .b-right{border-right:1px solid ${COR_BORDA}}
  .cell-2{flex:2}
  .cell-3{flex:3}

  /* TEXTO PRINCIPAL */
  .main-text{padding:14px;font-size:11px;line-height:1.8;text-align:justify;border:1px solid ${COR_BORDA};border-top:none;background:#fafafa}
  .main-text strong{font-weight:700}

  /* LISTA */
  .list-section{border:1px solid ${COR_BORDA};border-top:none;padding:10px 14px}
  .check-item{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px}
  .check-item .check{color:#16a34a;font-weight:bold;font-size:14px}

  /* CUIDADOS */
  .cuidados{border:1px solid ${COR_BORDA};border-top:none;padding:10px 14px}
  .cuidados ul{margin:0;padding-left:18px}
  .cuidados li{margin-bottom:4px;font-size:10px;line-height:1.5}
  .warning{margin-top:8px;padding:6px 10px;background:#fef3c7;border-left:3px solid #f59e0b;font-size:10px;font-weight:600;color:#92400e}

  /* PRODUTOS */
  .prod-table{width:100%;border-collapse:collapse;font-size:10px}
  .prod-table th,.prod-table td{padding:6px 8px;text-align:left;border:1px solid ${COR_BORDA}}
  .prod-table th{background:${COR_PRIMARIA};color:#fff;font-weight:700;text-transform:uppercase;font-size:9px}
  .prod-table td{font-family:'Courier New',monospace}
  .prod-subtitle{font-weight:700;background:#f1f5f9}

  /* ASSINATURAS */
  .sig-section{border:1px solid ${COR_BORDA};border-top:none}
  .sig-header-row{display:flex;background:${COR_PRIMARIA}}
  .sig-head{flex:1;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;padding:4px;border-right:1px solid rgba(255,255,255,.25);letter-spacing:.5px}
  .sig-head:last-child{border-right:none}
  .sig-body-row{display:flex;border-top:1px solid ${COR_BORDA}}
  .sig-cell{flex:1;padding:8px 10px;border-right:1px solid ${COR_BORDA};text-align:center}
  .sig-cell:last-child{border-right:none}
  .sig-name{font-size:10px;font-weight:700;margin-bottom:2px}
  .sig-reg{font-size:9px;color:#64748b;margin-bottom:4px}
  .sig-area{height:68px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
  .sig-line{width:75%;border-bottom:1px solid #333;margin:0 auto}

  /* RODAPÉ */
  .footer{margin-top:12px;text-align:center;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px}
  .footer .alvaras{font-size:8px;margin-top:4px}

  @media print{body{padding:0}.page{padding:10px 14px}}
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    ${logoB64 ? `<img class="logo" src="${logoB64}" alt="Logo" />` : ''}
    <div class="header-info">
      <div class="fantasia">${nomeEmpresa.toUpperCase()}</div>
      ${emp.razaoSocial ? `<div class="razao">${emp.razaoSocial}</div>` : ''}
      ${endEmp ? `<div>${endEmp}${emp.cep ? ' &nbsp;CEP: ' + emp.cep : ''}</div>` : ''}
      ${cfg.telefone ? `<div>Tel: ${formatTelefone(cfg.telefone)}</div>` : ''}
      ${emp.email ? `<div>Email: ${emp.email}</div>` : ''}
      ${emp.cnpj ? `<div>CNPJ: ${formatCNPJ(emp.cnpj)}</div>` : ''}
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="title-bar">
    <div class="title-main">
      <h1>Certificado de Execução de Serviço</h1>
      <h2>Controle Integrado de Pragas Urbanas</h2>
    </div>
    <div class="title-num">
      <span class="lbl">N&ordm;</span>
      <span class="num">${certificado.numero_certificado}</span>
    </div>
  </div>

  <!-- DADOS DO CERTIFICADO -->
  <div class="section">
    <div class="section-header">Dados do Certificado</div>
    <div class="row">
      <div class="cell b-right">
        <span class="cell-label">OS Referência</span>
        <span class="cell-val">${numOS}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Data de Emissão</span>
        <span class="cell-val">${dataEmissaoShort}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Validade</span>
        <span class="cell-val">${dataValidadeShort}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Garantia</span>
        <span class="cell-val">${garantia} meses</span>
      </div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="section">
    <div class="section-header">Dados do Cliente</div>
    <div class="row">
      <div class="cell b-right cell-2">
        <span class="cell-label">Cliente</span>
        <span class="cell-val">${nomeCliente}</span>
      </div>
      <div class="cell">
        <span class="cell-label">${cliente?.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</span>
        <span class="cell-val">${cliente?.tipo_pessoa === 'fisica' ? (cliente?.cpf || '-') : formatCNPJ(cliente?.cnpj || '')}</span>
      </div>
    </div>
    ${endCliente ? `<div class="row">
      <div class="cell">
        <span class="cell-label">Endereço</span>
        <span class="cell-val">${endCliente}</span>
      </div>
    </div>` : ''}
  </div>

  <!-- TEXTO PRINCIPAL -->
  <div class="section">
    <div class="section-header">Declaração</div>
  </div>
  <div class="main-text">
    O presente certificado é emitido pela <strong>${nomeEmpresa.toUpperCase()}</strong>, registrada na Vigilância Sanitária e Órgãos competentes, em favor de <strong>${nomeCliente}</strong>${endCliente ? `, localizado(a) em ${endCliente}` : ''}, referente à execução dos serviços de <strong>${tipoServico}</strong>, conforme O.S Nº <strong>${numOS}</strong>, com garantia de <strong>${garantia} meses</strong>, a partir da emissão deste certificado em <strong>${dataEmissao}</strong>.
  </div>

  <!-- SERVIÇOS REALIZADOS -->
  ${servicosMatch.length > 0 ? `
  <div class="section">
    <div class="section-header">Serviços Realizados</div>
  </div>
  <div class="list-section">
    ${servicosMatch.map(sv => `<div class="check-item"><span class="check">&#10003;</span> ${sv.nome}</div>`).join('')}
  </div>` : ''}

  <!-- PRAGAS ALVO -->
  ${structured?.pragas_selecionadas && structured.pragas_selecionadas.length > 0 ? `
  <div class="section">
    <div class="section-header">Praga(s) Alvo Tratada(s)</div>
  </div>
  <div class="list-section">
    ${structured.pragas_selecionadas.map(p => `<div class="check-item"><span class="check">&#10003;</span> ${p}</div>`).join('')}
  </div>` : ''}

  <!-- CUIDADOS -->
  ${cuidados.length > 0 ? `
  <div class="section">
    <div class="section-header">Observações e Cuidados Especiais</div>
  </div>
  <div class="cuidados">
    <ul>
      ${cuidados.map(c => `<li>${c.trim()}</li>`).join('')}
    </ul>
    <div class="warning">&#9888; EM CASO DE INTOXICAÇÃO, LIGUE: 0800-643-5252</div>
  </div>` : ''}

  <!-- PRODUTOS -->
  ${structured && (structured.venenos.length > 0 || structured.diluicoes.length > 0) ? `
  <div class="section">
    <div class="section-header">Produtos e Dosagens Aplicadas</div>
  </div>
  <table class="prod-table">
    <thead>
      <tr><th style="width:50%">Produtos</th><th style="width:50%">Diluições</th></tr>
    </thead>
    <tbody>
      ${(() => {
        const allVenenos = structured.venenos.flatMap(g => [{ titulo: g.titulo, items: g.items }])
        const allDiluicoes = structured.diluicoes.flatMap(g => [{ titulo: g.titulo, items: g.items }])
        const maxGroups = Math.max(allVenenos.length, allDiluicoes.length)
        let rows = ''
        for (let i = 0; i < maxGroups; i++) {
          const v = allVenenos[i]
          const d = allDiluicoes[i]
          if (v) {
            rows += `<tr><td class="prod-subtitle">${v.titulo}</td><td class="prod-subtitle">${d?.titulo || ''}</td></tr>`
            const maxItems = Math.max(v.items.length, d?.items.length || 0)
            for (let j = 0; j < maxItems; j++) {
              rows += `<tr><td>${v.items[j] || ''}</td><td>${d?.items[j] || ''}</td></tr>`
            }
          } else if (d) {
            rows += `<tr><td class="prod-subtitle"></td><td class="prod-subtitle">${d.titulo}</td></tr>`
            for (const item of d.items) {
              rows += `<tr><td></td><td>${item}</td></tr>`
            }
          }
        }
        return rows
      })()}
    </tbody>
  </table>` : ''}

  <!-- ASSINATURAS -->
  <div class="sig-section">
    <div class="sig-header-row">
      <div class="sig-head">Responsável Legal</div>
      <div class="sig-head">Responsável Técnico</div>
    </div>
    <div class="sig-body-row">
      <div class="sig-cell">
        <div class="sig-name">${cfg.responsavel_legal_nome || 'Responsável Legal'}</div>
        <div class="sig-reg">${cfg.responsavel_legal_cargo || ''}</div>
        <div class="sig-area">${sigLegalImg}</div>
        ${cfg.responsavel_legal_cpf ? `<div class="sig-reg">CPF: ${cfg.responsavel_legal_cpf}</div>` : ''}
      </div>
      <div class="sig-cell">
        <div class="sig-name">${cfg.responsavel_tecnico_nome || 'Responsável Técnico'}</div>
        <div class="sig-reg">${cfg.responsavel_tecnico_cargo || ''}${cfg.responsavel_tecnico_registro ? ' · Reg: ' + cfg.responsavel_tecnico_registro : ''}</div>
        <div class="sig-area">${sigTecnicoImg}</div>
      </div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    <div>Centro de Informações Toxicológicas: 0800-643-5252</div>
    ${alvaras.length > 0 ? `<div class="alvaras">${alvaras.join(' &nbsp;|&nbsp; ')}</div>` : ''}
  </div>

</div>
</body>
</html>`

  const pdfFilename = `certificado-${certificado.numero_certificado || Date.now()}.pdf`
  await openAsPdf(html, pdfFilename)
}
