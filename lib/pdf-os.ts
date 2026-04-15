import { openAsPdf } from './pdf-open'
import type { OrdemServico } from './types'
import type { Cliente } from './types'
import { formatDateBRFromYYYYMMDD } from './utils'
import { urlToBase64 } from './pdf-image-utils'

// ─── Cores fixas — sem dependência de template ───────────────────────────────
const COR_PRIMARIA   = '#1e293b'   // cabeçalho das seções (azul-escuro/preto)
const COR_HEADER_TXT = '#ffffff'   // texto no cabeçalho das seções
const COR_BORDA      = '#94a3b8'   // bordas gerais
const COR_TEXTO      = '#1e293b'   // texto principal
const FONTE          = "'Arial', sans-serif"

interface EmpresaConfig {
  responsavel_legal_nome: string
  responsavel_legal_cargo: string
  responsavel_legal_cpf: string
  responsavel_tecnico_nome: string
  responsavel_tecnico_registro: string
  responsavel_tecnico_cargo: string
  telefone: string
  assinatura_legal_tipo: string
  assinatura_legal_url: string
  assinatura_tecnico_tipo: string
  assinatura_tecnico_url: string
}

interface EmpresaData {
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  email: string
  nomeCompleto: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

interface TemplateStyle {
  nome_empresa: string
  subtitulo_empresa: string
  logo_url: string
  texto_rodape: string
}

async function fetchTemplate(): Promise<TemplateStyle> {
  try {
    const res = await fetch('/api/templates?tipo=os')
    if (res.ok) {
      const t = await res.json()
      if (t) return {
        nome_empresa: t.nome_empresa || 'Ordem de Servico',
        subtitulo_empresa: t.subtitulo_empresa || 'Controle de Servicos e Execucao',
        logo_url: t.logo_url || '',
        texto_rodape: t.texto_rodape || '',
      }
    }
  } catch {}
  return { nome_empresa: 'Ordem de Servico', subtitulo_empresa: 'Controle de Servicos e Execucao', logo_url: '', texto_rodape: '' }
}

async function fetchEmpresaData(): Promise<EmpresaData> {
  try {
    const res = await fetch('/api/user/empresa')
    if (res.ok) return await res.json()
  } catch {}
  return { nomeFantasia: '', razaoSocial: '', cnpj: '', email: '', nomeCompleto: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }
}

async function fetchEmpresaConfig(): Promise<EmpresaConfig> {
  try {
    const res = await fetch('/api/user/config')
    if (res.ok) return await res.json()
  } catch {}
  return {
    responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '',
    responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '',
    telefone: '',
    assinatura_legal_tipo: 'nenhuma', assinatura_legal_url: '',
    assinatura_tecnico_tipo: 'nenhuma', assinatura_tecnico_url: '',
  }
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return n || '-'
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatCPF(cpf: string) {
  if (!cpf) return '-'
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11) return n || '-'
  return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function formatTelefone(tel: string) {
  if (!tel) return '-'
  const n = tel.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return tel
}

export async function generateOrderPDF(ordem: OrdemServico): Promise<void> {
  const [s, emp, cfg] = await Promise.all([fetchTemplate(), fetchEmpresaData(), fetchEmpresaConfig()])

  // Converter imagens para base64 (funciona no Electron empacotado)
  const [logoB64, sigLegalB64, sigTecnicoB64] = await Promise.all([
    urlToBase64(s.logo_url),
    urlToBase64(cfg.assinatura_legal_url),
    urlToBase64(cfg.assinatura_tecnico_url),
  ])

  const cliente = ordem.cliente as Partial<Cliente> | undefined
  const formatDate = (d: string) => formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const endEmp = [
    emp.logradouro ? `${emp.logradouro}${emp.numero ? ', ' + emp.numero : ''}` : '',
    emp.bairro ? `Bairro: ${emp.bairro}` : '',
    emp.cidade ? `${emp.cidade}${emp.estado ? ' - ' + emp.estado : ''}` : '',
  ].filter(Boolean).join(' ')

  const endCliente = cliente?.endereco
    ? `${cliente.endereco}${cliente.cidade ? ', ' + cliente.cidade : ''}${cliente.estado ? ' - ' + cliente.estado : ''}`
    : '-'

  const documento = cliente?.tipo_pessoa === 'fisica'
    ? `CPF: ${formatCPF(cliente?.cpf ?? '')}`
    : `CNPJ: ${formatCNPJ(cliente?.cnpj ?? '')}`

  // Assinatura Responsável Legal (dono)
  const sigLegalImg = cfg.assinatura_legal_tipo === 'fisica' && sigLegalB64
    ? `<img src="${sigLegalB64}" alt="Assinatura Legal" style="max-height:58px;max-width:140px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  // Assinatura Responsável Técnico (químico)
  const sigTecnicoImg = cfg.assinatura_tecnico_tipo === 'fisica' && sigTecnicoB64
    ? `<img src="${sigTecnicoB64}" alt="Assinatura Tecnico" style="max-height:58px;max-width:140px;object-fit:contain;" />`
    : '<div class="sig-line"></div>'

  const extraLines = Array(6).fill('<div class="det-line"></div>').join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ordem de Servico ${ordem.numero_os}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${FONTE};font-size:11px;color:${COR_TEXTO};background:#fff}
  .page{padding:18px 22px;max-width:820px;margin:0 auto}

  /* CABEÇALHO */
  .header{display:flex;align-items:flex-start;gap:14px;margin-bottom:12px}
  .header img{max-height:80px;max-width:100px;object-fit:contain;flex-shrink:0}
  .header-info{flex:1;font-size:10px;line-height:1.6}
  .header-info .fantasia{font-size:13px;font-weight:700}
  .header-info .razao{font-size:11px;font-weight:600}

  /* TÍTULO */
  .title-bar{display:flex;align-items:stretch;border:2px solid ${COR_PRIMARIA};margin-bottom:0}
  .title-main{flex:1;padding:8px 12px}
  .title-main h1{font-size:20px;font-weight:900;color:${COR_PRIMARIA};text-transform:uppercase;letter-spacing:.5px}
  .title-main h2{font-size:10px;font-weight:600;color:#475569}
  .title-num{background:${COR_PRIMARIA};color:#fff;padding:8px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:110px}
  .title-num .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.5px;opacity:.8}
  .title-num .num{font-size:18px;font-weight:900;letter-spacing:1px}

  /* SEÇÕES */
  .section{border:1px solid ${COR_BORDA};border-top:none}
  .section-header{background:${COR_PRIMARIA};color:${COR_HEADER_TXT};font-size:9px;font-weight:700;padding:3px 8px;text-transform:uppercase;letter-spacing:.7px}
  .row{display:flex;border-top:1px solid ${COR_BORDA}}
  .cell{padding:4px 8px;flex:1}
  .cell-label{font-weight:700;font-size:9px;text-transform:uppercase;color:#64748b;display:block;margin-bottom:1px}
  .cell-val{font-size:11px}
  .b-right{border-right:1px solid ${COR_BORDA}}
  .cell-2{flex:2}
  .cell-3{flex:3}

  /* CAMPOS ABERTOS */
  .field-box{border-top:1px solid ${COR_BORDA};padding:5px 8px;min-height:38px;font-size:11px}

  /* DETALHAMENTO */
  .det-content{padding:6px 8px 4px;min-height:90px;font-size:11px}
  .det-content pre{font-family:${FONTE};white-space:pre-wrap;font-size:11px;line-height:1.9}
  .det-line{border-bottom:1px solid #e2e8f0;height:22px}

  /* GARANTIA */
  .gar-row{display:flex;border-top:1px solid ${COR_BORDA}}
  .gar-cell{flex:1;padding:4px 8px;border-right:1px solid ${COR_BORDA}}
  .gar-cell:last-child{border-right:none}

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
  .sig-date{font-size:10px;font-weight:600;margin-top:6px}

  /* RODAPÉ */
  .footer{margin-top:8px;text-align:center;font-size:9px;color:#94a3b8}

  @media print{body{padding:0}.page{padding:10px 14px}}
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    ${logoB64 ? `<img src="${logoB64}" alt="Logo" />` : ''}
    <div class="header-info">
      <div class="fantasia">${emp.nomeFantasia || s.nome_empresa}</div>
      ${emp.razaoSocial ? `<div class="razao">${emp.razaoSocial}</div>` : ''}
      ${endEmp ? `<div>${endEmp}${emp.cep ? ' &nbsp;CEP: ' + emp.cep : ''}</div>` : ''}
      ${cfg.telefone ? `<div>Tel: ${formatTelefone(cfg.telefone)}</div>` : ''}
      ${emp.email ? `<div>Email: ${emp.email}</div>` : ''}
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="title-bar">
    <div class="title-main">
      <h1>Ordem de Servico</h1>
      <h2>${s.subtitulo_empresa}</h2>
    </div>
    <div class="title-num">
      <span class="lbl">N&ordm;</span>
      <span class="num">${ordem.numero_os}</span>
    </div>
  </div>

  <!-- EMPRESA ESPECIALIZADA -->
  <div class="section">
    <div class="section-header">Informações da Empresa Especializada</div>
    <div class="row">
      <div class="cell b-right">
        <span class="cell-label">CNPJ</span>
        <span class="cell-val">${formatCNPJ(emp.cnpj)}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Responsavel Tecnico</span>
        <span class="cell-val">${ordem.tecnico_responsavel || cfg.responsavel_tecnico_nome || '-'}</span>
      </div>
      <div class="cell">
        <span class="cell-label">N&ordm; Registro</span>
        <span class="cell-val">${cfg.responsavel_tecnico_registro || '-'}</span>
      </div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="section">
    <div class="section-header">Informações do Cliente</div>
    <div class="row">
      <div class="cell cell-2 b-right">
        <span class="cell-label">Nome / Razao Social</span>
        <span class="cell-val">${cliente?.razao_social || '-'}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Valor</span>
        <span class="cell-val">${ordem.valor != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ordem.valor) : '-'}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Status</span>
        <span class="cell-val">${{ pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluida', cancelada: 'Cancelada' }[ordem.status] || ordem.status}</span>
      </div>
    </div>
    <div class="row">
      <div class="cell">
        <span class="cell-label">${cliente?.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</span>
        <span class="cell-val">${cliente?.tipo_pessoa === 'fisica' ? formatCPF(cliente?.cpf ?? '') : formatCNPJ(cliente?.cnpj ?? '')}</span>
      </div>
    </div>
    <div class="row">
      <div class="cell">
        <span class="cell-label">Endereco</span>
        <span class="cell-val">${endCliente}</span>
      </div>
    </div>
    <div class="row">
      <div class="cell b-right">
        <span class="cell-label">Telefone</span>
        <span class="cell-val">${formatTelefone(cliente?.telefone ?? '')}</span>
      </div>
      <div class="cell b-right">
        <span class="cell-label">Email</span>
        <span class="cell-val">${cliente?.email || '-'}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Data de Execucao</span>
        <span class="cell-val">${ordem.data_execucao ? formatDate(ordem.data_execucao) : '-'}</span>
      </div>
    </div>
  </div>

  <!-- SERVIÇO PRESTADO -->
  <div class="section">
    <div class="section-header">Servico Prestado</div>
    <div class="field-box">${ordem.tipo_servico}</div>
  </div>

  <!-- OBSERVAÇÕES -->
  <div class="section">
    <div class="section-header">Observações</div>
    <div class="field-box" style="min-height:44px">${ordem.observacoes || '&nbsp;'}</div>
  </div>

  <!-- DETALHAMENTO -->
  <div class="section">
    <div class="section-header">Detalhamento do Procedimento Executado</div>
    <div class="det-content">
      ${ordem.descricao_servico ? `<pre>${ordem.descricao_servico}</pre>` : ''}
      ${!ordem.descricao_servico ? extraLines : ''}
    </div>
  </div>

  <!-- GARANTIA -->
  <div class="section">
    <div class="section-header">Condições de Garantia</div>
    <div class="gar-row">
      <div class="gar-cell">
        <span class="cell-label">Garantia</span>
        <span class="cell-val">${ordem.garantia_meses != null ? ordem.garantia_meses + ' mes(es)' : '-'}</span>
      </div>
      <div class="gar-cell">
        <span class="cell-label">Visitas Gratuitas</span>
        <span class="cell-val">${typeof ordem.visitas_gratuitas === 'number' ? ordem.visitas_gratuitas : 0}</span>
      </div>
      <div class="gar-cell">
        <span class="cell-label">Local de Execucao</span>
        <span class="cell-val">${ordem.local_execucao || '-'}</span>
      </div>
      <div class="gar-cell">
        <span class="cell-label">Area Tratada</span>
        <span class="cell-val">${ordem.area_tratada || '-'}</span>
      </div>
    </div>
  </div>

  <!-- ASSINATURAS -->
  <div class="sig-section">
    <div class="sig-header-row">
      <div class="sig-head">Responsavel Legal</div>
      <div class="sig-head">Responsavel Tecnico</div>
      <div class="sig-head">Cliente</div>
    </div>
    <div class="sig-body-row">

      <!-- RESPONSÁVEL LEGAL (dono da empresa) -->
      <div class="sig-cell">
        <div class="sig-name">${cfg.responsavel_legal_nome || 'Responsavel Legal'}</div>
        <div class="sig-reg">${cfg.responsavel_legal_cargo || ''}</div>
        <div class="sig-area">${sigLegalImg}</div>
        ${cfg.responsavel_legal_cpf ? `<div class="sig-reg">CPF: ${formatCPF(cfg.responsavel_legal_cpf)}</div>` : ''}
      </div>

      <!-- RESPONSÁVEL TÉCNICO (químico) -->
      <div class="sig-cell">
        <div class="sig-name">${cfg.responsavel_tecnico_nome || 'Responsavel Tecnico'}</div>
        <div class="sig-reg">${cfg.responsavel_tecnico_cargo || ''}</div>
        <div class="sig-area">${sigTecnicoImg}</div>
        ${cfg.responsavel_tecnico_registro ? `<div class="sig-reg">N&ordm; Registro: ${cfg.responsavel_tecnico_registro}</div>` : ''}
      </div>

      <!-- CLIENTE -->
      <div class="sig-cell">
        <div class="sig-name">${cliente?.razao_social || 'Cliente'}</div>
        <div class="sig-reg">${documento}</div>
        <div class="sig-area"><div class="sig-line"></div></div>
        <div class="sig-date">Data do Servico: ${ordem.data_execucao ? formatDate(ordem.data_execucao) : '___/___/______'}</div>
      </div>

    </div>
  </div>

  ${s.texto_rodape ? `<div class="footer">${s.texto_rodape}</div>` : ''}

</div>
</body>
</html>`

  const pdfFilename = `order-${ordem.numero_os || 'os'}-${Date.now()}.pdf`
  await openAsPdf(html, pdfFilename)
}