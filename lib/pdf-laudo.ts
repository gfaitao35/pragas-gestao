import { openAsPdf } from './pdf-open'
import { formatDateBRFromYYYYMMDD } from './utils'
import { urlToBase64, urlsToBase64 } from './pdf-image-utils'

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
  return { responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '', responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '', telefone: '', assinatura_legal_tipo: 'nenhuma', assinatura_legal_url: '', assinatura_tecnico_tipo: 'nenhuma', assinatura_tecnico_url: '' }
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return cnpj
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export interface LaudoData {
  numero_laudo: string
  texto: string
  imagens: string[]
  numero_os: string
  tipo_servico: string
  data_execucao: string
  cliente_nome: string
  cliente_tipo_pessoa?: string
  cliente_cnpj?: string
  cliente_cpf?: string
  cliente_endereco?: string
  cliente_cidade?: string
  cliente_estado?: string
}

export async function generateLaudoPDF(laudo: LaudoData): Promise<void> {
  const [s, emp, cfg] = await Promise.all([fetchTemplate(), fetchEmpresaData(), fetchEmpresaConfig()])

  // Converter todas as imagens para base64 (funciona no Electron empacotado)
  const [logoB64, sigLegalB64, sigTecnicoB64, imagensB64] = await Promise.all([
    urlToBase64(s.logo_url),
    urlToBase64(cfg.assinatura_legal_url),
    urlToBase64(cfg.assinatura_tecnico_url),
    urlsToBase64(laudo.imagens),
  ])

  const formatDate = (d: string) => formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const endEmp = [
    emp.logradouro ? `${emp.logradouro}${emp.numero ? ', ' + emp.numero : ''}` : '',
    emp.bairro ? `Bairro: ${emp.bairro}` : '',
    emp.cidade ? `${emp.cidade}${emp.estado ? ' - ' + emp.estado : ''}` : '',
  ].filter(Boolean).join(' ')

  const endCliente = [
    laudo.cliente_endereco,
    laudo.cliente_cidade,
    laudo.cliente_estado,
  ].filter(Boolean).join(', ')

  const sigLegalImg = cfg.assinatura_legal_tipo === 'fisica' && sigLegalB64
    ? `<img src="${sigLegalB64}" style="max-height:60px;max-width:150px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  const sigTecnicoImg = cfg.assinatura_tecnico_tipo === 'fisica' && sigTecnicoB64
    ? `<img src="${sigTecnicoB64}" style="max-height:60px;max-width:150px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  // Grid de imagens — 2 por linha
  const imagensHtml = imagensB64.length > 0
    ? `<div class="img-grid">${imagensB64.map(b64 =>
        `<div class="img-item"><img src="${b64}" /></div>`
      ).join('')}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Laudo Técnico ${laudo.numero_laudo}</title>
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
  .title-main h1{font-size:20px;font-weight:900;color:${COR_PRIMARIA};text-transform:uppercase}
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

  /* TEXTO DO LAUDO */
  .laudo-texto{border:1px solid ${COR_BORDA};border-top:none;padding:12px 14px;font-size:11px;line-height:1.8;white-space:pre-wrap;text-align:justify}

  /* GRID DE FOTOS */
  .img-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;border:1px solid ${COR_BORDA};border-top:none}
  .img-item{aspect-ratio:4/3;overflow:hidden;border:1px solid #e2e8f0;border-radius:2px}
  .img-item img{width:100%;height:100%;object-fit:cover}

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

  @media print{body{padding:0}.page{padding:10px 14px}}
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    ${logoB64 ? `<img class="logo" src="${logoB64}" alt="Logo" />` : ''}
    <div class="header-info">
      <div class="fantasia">${emp.nomeFantasia || s.nome_empresa}</div>
      ${emp.razaoSocial ? `<div class="razao">${emp.razaoSocial}</div>` : ''}
      ${endEmp ? `<div>${endEmp}${emp.cep ? ' &nbsp;CEP: ' + emp.cep : ''}</div>` : ''}
      ${cfg.telefone ? `<div>Tel: ${cfg.telefone}</div>` : ''}
      ${emp.email ? `<div>Email: ${emp.email}</div>` : ''}
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="title-bar">
    <div class="title-main">
      <h1>Laudo Técnico</h1>
      <h2>Controle de Vetores e Pragas Urbanas</h2>
    </div>
    <div class="title-num">
      <span class="lbl">N&ordm;</span>
      <span class="num">${laudo.numero_laudo}</span>
    </div>
  </div>

  <!-- DADOS DA OS -->
  <div class="section">
    <div class="section-header">Informações do Serviço</div>
    <div class="row">
      <div class="cell b-right">
        <span class="cell-label">OS Referência</span>
        <span class="cell-val">${laudo.numero_os}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Tipo de Serviço</span>
        <span class="cell-val">${laudo.tipo_servico}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Data de Execução</span>
        <span class="cell-val">${laudo.data_execucao ? formatDate(laudo.data_execucao) : '-'}</span>
      </div>
    </div>
    <div class="row">
      <div class="cell b-right cell-2">
        <span class="cell-label">Cliente</span>
        <span class="cell-val">${laudo.cliente_nome || '-'}</span>
      </div>
      <div class="cell">
        <span class="cell-label">${laudo.cliente_tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</span>
        <span class="cell-val">${laudo.cliente_tipo_pessoa === 'fisica' ? (laudo.cliente_cpf || '-') : formatCNPJ(laudo.cliente_cnpj || '')}</span>
      </div>
    </div>
    ${endCliente ? `<div class="row">
      <div class="cell">
        <span class="cell-label">Endereço</span>
        <span class="cell-val">${endCliente}</span>
      </div>
    </div>` : ''}
  </div>

  <!-- EMPRESA ESPECIALIZADA -->
  <div class="section">
    <div class="section-header">Empresa Especializada</div>
    <div class="row">
      <div class="cell b-right">
        <span class="cell-label">CNPJ</span>
        <span class="cell-val">${formatCNPJ(emp.cnpj)}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Responsável Legal</span>
        <span class="cell-val">${cfg.responsavel_legal_nome || '-'}</span>
      </div>
    </div>
  </div>

  <!-- TEXTO DO LAUDO -->
  <div class="section">
    <div class="section-header">Laudo Técnico</div>
    <div class="laudo-texto">${laudo.texto}</div>
  </div>

  <!-- FOTOS -->
  ${laudo.imagens.length > 0 ? `
  <div class="section">
    <div class="section-header">Registro Fotográfico</div>
    ${imagensHtml}
  </div>` : ''}

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

</div>
</body>
</html>`

  const pdfFilename = `laudo-${laudo.numero_laudo || 'laudo'}-${Date.now()}.pdf`
  await openAsPdf(html, pdfFilename)
}