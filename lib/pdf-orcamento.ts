import type { Orcamento } from '@/types/orcamento'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'
import { urlToBase64 } from '@/lib/pdf-image-utils'
import { openAsPdf } from '@/lib/pdf-open'

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
  pais: string
}

interface EmpresaConfig {
  responsavel_legal_nome: string
  responsavel_legal_cargo: string
  responsavel_legal_cpf: string
  responsavel_tecnico_nome: string
  responsavel_tecnico_registro: string
  responsavel_tecnico_cargo: string
  alvara_sanitario: string
  alvara_licenca: string
  certificado_registro: string
  telefone: string
  assinatura_legal_tipo: string
  assinatura_legal_url: string
  assinatura_tecnico_tipo: string
  assinatura_tecnico_url: string
}

const defaultStyle: TemplateStyle = {
  nome_empresa: 'Orcamento de Servicos',
  subtitulo_empresa: 'Proposta Comercial',
  logo_url: '',
  cor_primaria: '#1e293b',
  cor_secundaria: '#475569',
  cor_texto: '#1e293b',
  fonte_familia: "'Times New Roman', Times, serif",
  fonte_tamanho: 12,
  mostrar_borda: true,
  estilo_borda: 'solid',
  texto_rodape: '',
  texto_assinatura: '',
  nome_assinatura: 'Responsavel Comercial',
  cargo_assinatura: 'Consultor Tecnico',
}

async function fetchTemplate(): Promise<TemplateStyle> {
  try {
    // Busca os dois templates em paralelo
    const [resOrc, resOs] = await Promise.all([
      fetch('/api/templates?tipo=orcamento'),
      fetch('/api/templates?tipo=os'),
    ])

    const tOrc = resOrc.ok ? await resOrc.json() : null
    const tOs  = resOs.ok  ? await resOs.json()  : null

    // Usa dados do template orcamento, mas logo SEMPRE do template OS (onde é salva)
    const t = tOrc || tOs
    const logoUrl = tOs?.logo_url || tOrc?.logo_url || ''

    if (t) {
      return {
        nome_empresa: t.nome_empresa || defaultStyle.nome_empresa,
        subtitulo_empresa: t.subtitulo_empresa || defaultStyle.subtitulo_empresa,
        logo_url: logoUrl,
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
      }
    }
  } catch {}
  return defaultStyle
}

async function fetchEmpresaData(): Promise<EmpresaData> {
  try {
    const res = await fetch('/api/user/empresa')
    if (res.ok) return await res.json()
  } catch {}
  return { nomeFantasia: '', razaoSocial: '', cnpj: '', email: '', nomeCompleto: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', pais: '' }
}

async function fetchEmpresaConfig(): Promise<EmpresaConfig> {
  try {
    const res = await fetch('/api/user/config')
    if (res.ok) return await res.json()
  } catch {}
  return { responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '', responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '', alvara_sanitario: '', alvara_licenca: '', certificado_registro: '', telefone: '', assinatura_legal_tipo: 'nenhuma', assinatura_legal_url: '', assinatura_tecnico_tipo: 'nenhuma', assinatura_tecnico_url: '' }
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return ''
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function buildEnderecoEmpresa(emp: EmpresaData): string {
  const parts = []
  if (emp.logradouro) parts.push(emp.logradouro)
  if (emp.numero) parts.push(emp.numero)
  if (emp.bairro) parts.push(emp.bairro)
  if (emp.cidade) parts.push(emp.cidade)
  if (emp.estado) parts.push(emp.estado)
  return parts.join(', ')
}

export async function generateOrcamentoPDF(orcamento: Orcamento) {
  const [s, emp, cfg] = await Promise.all([fetchTemplate(), fetchEmpresaData(), fetchEmpresaConfig()])

  // Orçamento sempre em preto e branco
  s.cor_primaria = '#000000'
  s.cor_secundaria = '#333333'

  // Logo: usa template (fonte correta do banco), ignora orcamento.empresa?.logo que pode estar desatualizado
  const logoUrl = s.logo_url || ''
  const [logoB64, sigLegalB64] = await Promise.all([
    urlToBase64(logoUrl),
    urlToBase64(cfg.assinatura_legal_url),
  ])

  const formatDate = (dateString: string) => formatDateBRFromYYYYMMDD(dateString, { day: '2-digit', month: 'long', year: 'numeric' })
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const borderCss = s.mostrar_borda
    ? `border: ${s.estilo_borda === 'double' ? '3px' : '2px'} ${s.estilo_borda} ${s.cor_primaria};`
    : ''

  const enderecoEmpresa = buildEnderecoEmpresa(emp)
  const telefone = cfg.telefone || ''
  const nomeEmpresa = emp.nomeFantasia || s.nome_empresa || 'Empresa'

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orcamento ${orcamento.numero.toString().padStart(5, '0')}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4;margin:20mm 15mm}
    body{font-family:${s.fonte_familia};max-width:800px;margin:0 auto;font-size:${s.fonte_tamanho}px;color:${s.cor_texto}}
    .document{${borderCss}padding:36px}
    .header{display:flex;align-items:center;gap:20px;margin-bottom:10px}
    .header-logo{flex-shrink:0}
    .header-logo img{max-height:70px;max-width:140px;object-fit:contain}
    .header-info{flex:1}
    .header-info .company-name{font-size:22px;font-weight:bold;color:${s.cor_primaria};text-transform:uppercase;letter-spacing:1px}
    .header-info .company-sub{font-size:12px;color:${s.cor_secundaria};margin-top:2px}
    .header-info .company-details{font-size:10px;color:#64748b;margin-top:4px;line-height:1.5}
    .divider{height:2px;background:linear-gradient(to right,transparent,${s.cor_primaria},transparent);margin:16px 0}
    .doc-number{text-align:center;font-size:20px;font-weight:bold;color:${s.cor_primaria};margin-bottom:20px}
    .section-title{font-size:15px;font-weight:bold;color:${s.cor_primaria};margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid #e2e8f0}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin:10px 0}
    .label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
    .value{font-size:13px;margin-top:2px}
    .full{grid-column:span 2}
    .total-value{font-size:20px;font-weight:bold;color:${s.cor_primaria};text-align:right;margin:16px 0}
    .list{margin-left:20px;list-style-type:disc;font-size:13px}
    .list li{margin-bottom:4px}
    .signatures{display:flex;justify-content:space-around;margin-top:50px;gap:40px}
    .sig-block{text-align:center;flex:1}
    .sig-line{border-top:1px solid ${s.cor_texto};margin:0 auto 8px;width:200px}
    .sig-name{font-size:13px;font-weight:500}
    .sig-role{font-size:11px;color:#64748b}
    .rodape{margin-top:20px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;line-height:1.6}
    @media print{body{padding:0}.document{border-width:1px}}
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      ${logoB64 ? `<div class="header-logo"><img src="${logoB64}" alt="Logo" /></div>` : ''}
      <div class="header-info">
        <div class="company-name">${nomeEmpresa}</div>
        <div class="company-sub">${s.subtitulo_empresa}</div>
        <div class="company-details">
          ${emp.razaoSocial ? `${emp.razaoSocial}` : ''}${emp.cnpj ? ` | CNPJ: ${formatCNPJ(emp.cnpj)}` : ''}
          ${telefone || emp.email ? `<br/>${telefone ? `Tel: ${telefone}` : ''}${telefone && emp.email ? ' | ' : ''}${emp.email ? emp.email : ''}` : ''}
        </div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="doc-number">ORÇAMENTO N. ${orcamento.numero.toString().padStart(5, '0')}</div>

    <div class="section-title">Dados do Cliente</div>
    <div class="grid">
      <div class="full"><div class="label">Nome / Razão Social</div><div class="value">${orcamento.cliente.nome || '-'}</div></div>
      <div><div class="label">Contato / Telefone</div><div class="value">${orcamento.cliente.contato || '-'}</div></div>
      <div class="full"><div class="label">Endereço</div><div class="value">${orcamento.cliente.endereco || '-'}${orcamento.cliente.cidade ? `, ${orcamento.cliente.cidade}` : ''}</div></div>
    </div>

    <div class="section-title">${orcamento.tituloServico || 'Descrição do Serviço / Procedimentos'}</div>
    ${orcamento.procedimentos.map(p => {
      // Não duplica o título se for igual ao título do serviço
      const showTitulo = p.titulo && p.titulo.trim().toLowerCase() !== (orcamento.tituloServico || '').trim().toLowerCase()
      return `
      <div style="margin-bottom:14px;">
        ${showTitulo ? `<strong style="font-size:14px;color:${s.cor_secundaria}">${p.titulo}</strong>` : ''}
        <p style="margin-top:${showTitulo ? '4' : '0'}px;white-space:pre-wrap;font-size:13px;line-height:1.6">${p.descricao || '-'}</p>
      </div>
    `}).join('')}

    <div class="section-title">Garantia</div>
    <p style="font-size:13px">${orcamento.garantia || '-'}</p>

    <div class="section-title">Investimento Total</div>
    <div class="total-value">${formatCurrency(orcamento.valorInvestimento)}</div>

    <div class="section-title">Formas de Pagamento</div>
    <ul class="list">
      ${orcamento.formasPagamento.map(fp => `<li>${fp}</li>`).join('')}
    </ul>

    <div class="section-title">Considerações Finais</div>
    <ul class="list">
      ${orcamento.consideracoes.map(c => `<li>${c}</li>`).join('')}
    </ul>

    <div class="rodape">
      ${emp.razaoSocial ? `<strong>${emp.razaoSocial}</strong>` : ''}${emp.cnpj ? ` | CNPJ: ${formatCNPJ(emp.cnpj)}` : ''}<br/>
      ${telefone ? `Tel: ${telefone}` : ''}${telefone && emp.email ? ' | ' : ''}${emp.email ? emp.email : ''}
      ${cfg.alvara_sanitario || cfg.alvara_licenca || cfg.certificado_registro ? '<br/>' : ''}
      ${cfg.alvara_sanitario ? `Alvara Sanitario: ${cfg.alvara_sanitario}` : ''}
      ${cfg.alvara_sanitario && cfg.alvara_licenca ? ' | ' : ''}
      ${cfg.alvara_licenca ? `Alvara de Licenca: ${cfg.alvara_licenca}` : ''}
      ${(cfg.alvara_sanitario || cfg.alvara_licenca) && cfg.certificado_registro ? ' | ' : ''}
      ${cfg.certificado_registro ? `Cert. Registro: ${cfg.certificado_registro}` : ''}
      ${s.texto_rodape ? `<br/>${s.texto_rodape}` : ''}
    </div>
  </div>
</body>
</html>`

  const pdfFilename = `orcamento-${orcamento.numero || 'orcamento'}-${Date.now()}.pdf`
  await openAsPdf(htmlContent, pdfFilename)
}