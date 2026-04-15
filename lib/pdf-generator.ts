import { openAsPdf } from './pdf-open'
import type { Certificado } from './types'
import { formatDateBRFromYYYYMMDD } from './utils'
import { urlToBase64 } from './pdf-image-utils'

interface TemplateStyle {
  nome_empresa: string
  subtitulo_empresa: string
  logo_url: string
  cor_primaria: string
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
  observacoes_padrao: string
  telefone: string
  assinatura_legal_tipo: string
  assinatura_legal_url: string
  assinatura_tecnico_tipo: string
  assinatura_tecnico_url: string
}

const defaultStyle: TemplateStyle = {
  nome_empresa: '',
  subtitulo_empresa: 'Controle Integrado de Pragas Urbanas',
  logo_url: '',
  cor_primaria: '#1e40af',
  cor_texto: '#1e293b',
  fonte_familia: "'Times New Roman', Times, serif",
  fonte_tamanho: 12,
  mostrar_borda: true,
  estilo_borda: 'double',
  texto_rodape: '',
  texto_assinatura: '',
  nome_assinatura: 'Responsavel Tecnico',
  cargo_assinatura: 'Controlador de Pragas',
}

async function fetchTemplate(tipo: 'os' | 'certificado'): Promise<TemplateStyle> {
  try {
    const res = await fetch(`/api/templates?tipo=${tipo}`)
    if (res.ok) {
      const t = await res.json()
      if (t) {
        return {
          nome_empresa: t.nome_empresa || '',
          subtitulo_empresa: t.subtitulo_empresa || defaultStyle.subtitulo_empresa,
          logo_url: t.logo_url || '',
          cor_primaria: t.cor_primaria || defaultStyle.cor_primaria,
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
  return { responsavel_legal_nome: '', responsavel_legal_cargo: '', responsavel_legal_cpf: '', responsavel_tecnico_nome: '', responsavel_tecnico_registro: '', responsavel_tecnico_cargo: '', alvara_sanitario: '', alvara_licenca: '', certificado_registro: '', observacoes_padrao: '', telefone: '', assinatura_legal_tipo: 'nenhuma', assinatura_legal_url: '', assinatura_tecnico_tipo: 'nenhuma', assinatura_tecnico_url: '' }
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return cnpj
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatCPF(cpf: string) {
  if (!cpf) return '-'
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11) return cpf
  return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function formatTelefone(tel: string) {
  if (!tel) return '-'
  const n = tel.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return tel
}

function calcularGarantiaMeses(dataEmissao: string, dataValidade: string): string {
  try {
    const emissao = new Date(dataEmissao)
    const validade = new Date(dataValidade)
    const diffMs = validade.getTime() - emissao.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const meses = Math.round(diffDias / 30)
    const extenso: Record<number, string> = {
      1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis',
      7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze',
      18: 'dezoito', 24: 'vinte e quatro'
    }
    const ext = extenso[meses]
    return ext ? `${String(meses).padStart(2, '0')} (${ext})` : String(meses)
  } catch {
    return '06 (seis)'
  }
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

async function fetchServicos(): Promise<{ id: string; nome: string }[]> {
  try {
    const res = await fetch('/api/servicos')
    if (res.ok) return await res.json()
  } catch {}
  return []
}

export async function generateCertificatePDF(certificado: Certificado) {
  const [s, emp, cfg, servicos] = await Promise.all([
    fetchTemplate('os'),
    fetchEmpresaData(),
    fetchEmpresaConfig(),
    fetchServicos(),
  ])

  const ordem = certificado.ordem_servico as {
    numero_os: string; tipo_servico: string; data_execucao: string
    tecnico_responsavel?: string; produtos_aplicados?: string; area_tratada?: string; pragas_alvo?: string
    cliente?: { razao_social: string; tipo_pessoa?: string; cnpj?: string; cpf?: string; endereco?: string; cidade?: string; estado?: string; cep?: string; telefone?: string }
  } | undefined

  const cliente = ordem?.cliente
  const formatDate = (d: string) => formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: 'long', year: 'numeric' })
  const formatDateShort = (d: string) => formatDateBRFromYYYYMMDD(d, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const nomeEmpresa = emp.nomeFantasia || s.nome_empresa || 'Empresa'

  const endEmp = [
    emp.logradouro ? `${emp.logradouro}${emp.numero ? ', N°' + emp.numero : ''}` : '',
    emp.bairro ? `Bairro: ${emp.bairro}` : '',
    emp.cidade ? `${emp.cidade}${emp.estado ? ' - ' + emp.estado : ''}` : '',
  ].filter(Boolean).join(' ')

  const endCliente = cliente?.endereco
    ? `${cliente.endereco}${cliente.cidade ? ' – no município de ' + cliente.cidade : ''}${cliente.estado ? ' - ' + cliente.estado : ''}`
    : '-'

  // Texto do certificado
  const nomeCliente = cliente?.razao_social || '-'
  const tipoServico = ordem?.tipo_servico || '-'
  // Usa sempre o tipo_servico da OS (nome real dos serviços registrados)
  // pragas_alvo é um campo separado e NÃO deve sobrescrever o nome do serviço no texto
  const pragas = tipoServico
  const numOS = ordem?.numero_os || '-'
  // Calcula garantia real com base nas datas do certificado
  const garantiaMeses = calcularGarantiaMeses(certificado.data_emissao, certificado.data_validade)
  const dataEmissao = formatDate(certificado.data_emissao)

  // Serviços com checkbox — tipo_servico pode ter múltiplos serviços separados por vírgula
  // Ex: "Desratização, Dedetização" → compara cada nome individualmente
  const tiposServicoNomes = tipoServico.split(',').map((s: string) => s.trim().toLowerCase())
  const servicosMatchados = servicos.filter((sv: any) =>
    tiposServicoNomes.some((nome: string) =>
      nome.includes(sv.nome.toLowerCase()) ||
      sv.nome.toLowerCase().includes(nome)
    )
  )
  const obsDoServico = servicosMatchados.map((sv: any) => sv.observacoes_certificado).filter(Boolean).join('\n')

  // Dados estruturados (venenos/diluições) vêm sempre do certificado.observacoes
  const structuredMarker = '<!--STRUCTURED_DATA-->'
  let structuredData: { venenos: { titulo: string; items: string[] }[]; diluicoes: { titulo: string; items: string[] }[]; pragas_selecionadas?: string[] } | null = null
  let obsLegadoCertificado = ''
  const certObs = certificado.observacoes || ''
  if (certObs.includes(structuredMarker)) {
    const parts = certObs.split(structuredMarker)
    obsLegadoCertificado = parts[0].replace(/\nObservacao e Cuidados Especiais\n?$/, '').trim()
    try { structuredData = JSON.parse(parts[1]) } catch {}
  } else {
    obsLegadoCertificado = certObs
  }

  // Cuidados: prioriza o campo do serviço cadastrado, senão usa obs do certificado ou config padrão
  const cuidadosText = obsDoServico || obsLegadoCertificado || cfg.observacoes_padrao || ''
  const observacoesLines = cuidadosText.split('\n').filter((l: string) => l.trim())

  // Marca como checked todos os serviços que batem com os registrados na OS
  const servicosCheckbox = servicos
    .filter((sv: any) =>
      tiposServicoNomes.some((nome: string) =>
        nome.includes(sv.nome.toLowerCase()) ||
        sv.nome.toLowerCase().includes(nome)
      )
    )
    .map((sv: any) => ({ nome: sv.nome, checked: true }))

  // Converter imagens para base64 (funciona no Electron empacotado)
  const [logoB64, sigLegalB64, sigTecnicoB64] = await Promise.all([
    urlToBase64(s.logo_url),
    urlToBase64(cfg.assinatura_legal_url),
    urlToBase64(cfg.assinatura_tecnico_url),
  ])

  // Assinaturas
  const sigLegal = cfg.assinatura_legal_tipo === 'fisica' && sigLegalB64
    ? `<img src="${sigLegalB64}" class="sig-img" />`
    : '<div class="sig-line"></div>'
  const sigTecnico = cfg.assinatura_tecnico_tipo === 'fisica' && sigTecnicoB64
    ? `<img src="${sigTecnicoB64}" class="sig-img" />`
    : '<div class="sig-line"></div>'

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Certificado de Execução de Serviço ${certificado.numero_certificado}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  @page { size:A4; margin:0 }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #1a1a1a;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    font-size: 11px;
  }

  .page {
    padding: 14mm 16mm 12mm;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
    border: 1.5px solid #222;
    margin: 6mm;
    min-height: calc(297mm - 12mm);
  }

  /* CABEÇALHO */
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 14px;
  }
  .header-logo img {
    max-height: 60px;
    max-width: 100px;
    object-fit: contain;
  }
  .header-info { flex: 1 }
  .header-info .empresa-nome {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1a1a1a;
  }
  .header-info .empresa-sub {
    font-size: 9px;
    color: #555;
    margin-top: 3px;
    line-height: 1.6;
  }
  .header-num {
    text-align: right;
    border-left: 1px solid #ccc;
    padding-left: 14px;
    white-space: nowrap;
  }
  .header-num .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #777 }
  .header-num .num { font-size: 13px; font-weight: 700; color: #1a1a1a; margin-top: 2px }

  /* TÍTULO */
  .titulo-bloco { text-align: center; margin-bottom: 16px }
  .titulo-bloco h1 {
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #1a1a1a;
  }
  .titulo-bloco .subtitulo {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #666;
    margin-top: 4px;
  }
  .titulo-divider {
    height: 1px;
    background: #1a1a1a;
    margin: 8px 60px 0;
  }

  /* TEXTO PRINCIPAL */
  .cert-body {
    font-size: 11.5px;
    line-height: 2;
    text-align: justify;
    margin-bottom: 16px;
    padding: 14px 18px;
    border: 1px solid #ddd;
    background: #fafafa;
  }

  /* SEÇÃO */
  .section { margin-bottom: 12px }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1a1a1a;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin-bottom: 8px;
  }

  /* SERVIÇOS CHECKBOX */
  .servicos-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
  }
  .servico-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 10.5px;
  }
  .chk {
    width: 13px; height: 13px;
    border: 1.5px solid #333;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 900;
    flex-shrink: 0;
    background: #fff;
  }
  .chk.checked { background: #1a1a1a; color: #fff }

  /* OBSERVAÇÕES */
  .obs-list { padding-left: 16px; font-size: 10.5px; line-height: 1.9 }
  .obs-list li { margin-bottom: 2px }
  .obs-alert {
    margin-top: 8px;
    font-size: 10px;
    font-weight: 700;
    color: #7a3800;
    border: 1px solid #ccc;
    padding: 4px 10px;
    display: inline-block;
  }

  /* PRODUTOS */
  .produtos-grid { display: flex; gap: 16px }
  .produtos-col { flex: 1 }
  .produtos-col-title { font-size: 10px; font-weight: 700; margin-bottom: 4px; color: #444 }
  .produto-item { font-size: 10px; line-height: 1.8; font-family: 'Courier New', monospace }

  /* ASSINATURAS */
  .sig-row {
    display: flex;
    gap: 20px;
    margin-top: auto;
    padding-top: 14px;
  }
  .sig-block { flex: 1; text-align: center }
  .sig-img { max-height: 50px; max-width: 140px; object-fit: contain; margin: 0 auto 6px; display: block }
  .sig-line { border-top: 1px solid #1a1a1a; margin: 40px auto 6px; width: 85% }
  .sig-name { font-size: 11px; font-weight: 700 }
  .sig-role { font-size: 9px; color: #666; margin-top: 2px }
  .sig-reg { font-size: 9px; color: #444; font-weight: 600; margin-top: 2px }

  /* RODAPÉ */
  .rodape {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    text-align: center;
    font-size: 8.5px;
    color: #777;
    line-height: 1.8;
  }
  .rodape-alvaras {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .alvara-badge {
    font-size: 8px;
    font-weight: 600;
    border: 1px solid #ccc;
    padding: 2px 8px;
    color: #444;
  }

  @media print { body { margin: 0 } }
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    ${logoB64 ? `<div class="header-logo"><img src="${logoB64}" alt="Logo" /></div>` : ''}
    <div class="header-info">
      <div class="empresa-nome">${nomeEmpresa}</div>
      <div class="empresa-sub">
        ${emp.razaoSocial ? `${emp.razaoSocial}${emp.cnpj ? ' | CNPJ: ' + formatCNPJ(emp.cnpj) : ''}<br/>` : ''}
        ${endEmp || ''}
        ${cfg.telefone ? ' | Tel: ' + formatTelefone(cfg.telefone) : ''}${emp.email ? ' | ' + emp.email : ''}
      </div>
    </div>
    <div class="header-num">
      <div class="label">Certificado Nº</div>
      <div class="num">${certificado.numero_certificado}</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="titulo-bloco">
    <h1>Certificado de Execução de Serviço</h1>
    <div class="subtitulo">Controle Integrado de Pragas Urbanas</div>
    <div class="titulo-divider"></div>
  </div>

  <!-- TEXTO PRINCIPAL -->
  <div class="cert-body">
    O presente certificado é emitido pela <strong>${nomeEmpresa.toUpperCase()}</strong>,
    registrada na Vigilância Sanitária e Órgãos competentes, em favor de
    <strong>${nomeCliente}</strong>${endCliente !== '-' ? `, localizado(a) em ${endCliente}` : ''},
    referente à execução dos serviços de <strong>${pragas}</strong>,
    conforme O.S N° <strong>${numOS}</strong>, com garantia de <strong>${garantiaMeses} meses</strong>,
    a partir da emissão deste certificado em <strong>${dataEmissao}</strong>.
  </div>

  <!-- SERVIÇOS -->
  ${servicosCheckbox.length > 0 ? `
  <div class="section">
    <div class="section-title">Serviços Realizados</div>
    <div class="servicos-grid">
      ${servicosCheckbox.map(sv => `
        <div class="servico-item">
          <span class="chk ${sv.checked ? 'checked' : ''}">${sv.checked ? '✓' : ''}</span>
          <span>${sv.nome}</span>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- PRAGAS ALVO -->
  ${structuredData?.pragas_selecionadas && structuredData.pragas_selecionadas.length > 0 ? `
  <div class="section">
    <div class="section-title">Praga(s) Alvo Tratada(s)</div>
    <div class="servicos-grid">
      ${structuredData.pragas_selecionadas.map(praga => `
        <div class="servico-item">
          <span class="chk checked">✓</span>
          <span>${praga}</span>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- OBSERVAÇÕES -->
  ${observacoesLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Observações e Cuidados Especiais</div>
    <ul class="obs-list">
      ${observacoesLines.map((l: string) => `<li>${l.trim()}</li>`).join('')}
    </ul>
    <div class="obs-alert">⚠ EM CASO DE INTOXICAÇÃO, LIGUE: 0800-643-5252</div>
  </div>` : ''}

  <!-- PRODUTOS E DILUIÇÕES -->
  ${structuredData ? `
  <div class="section">
    <div class="section-title">Produtos e Dosagens Aplicadas</div>
    <div class="produtos-grid">
      <div class="produtos-col">
        <div class="produtos-col-title">Princípios Ativos</div>
        ${structuredData.venenos.map((g: { titulo: string; items: string[] }) => `
          <div style="font-weight:700;font-size:10px;margin:4px 0 2px">${g.titulo}</div>
          ${g.items.map((item: string) => `<div class="produto-item">${item}</div>`).join('')}
        `).join('')}
      </div>
      <div class="produtos-col">
        <div class="produtos-col-title">Diluição / Iscagem</div>
        ${structuredData.diluicoes.map((g: { titulo: string; items: string[] }) => `
          <div style="font-weight:700;font-size:10px;margin:4px 0 2px">${g.titulo}</div>
          ${g.items.map((item: string) => `<div class="produto-item">${item}</div>`).join('')}
        `).join('')}
      </div>
    </div>
  </div>` : ''}

  <!-- ASSINATURAS -->
  <div class="sig-row">
    <div class="sig-block">
      ${sigLegal}
      <div class="sig-name">${cfg.responsavel_legal_nome || 'Responsável Legal'}</div>
      <div class="sig-role">${cfg.responsavel_legal_cargo || 'Responsável Legal'}</div>
      ${cfg.responsavel_legal_cpf ? `<div class="sig-role">CPF: ${cfg.responsavel_legal_cpf}</div>` : ''}
    </div>
    <div class="sig-block">
      ${sigTecnico}
      <div class="sig-name">${cfg.responsavel_tecnico_nome || 'Responsável Técnico'}</div>
      <div class="sig-role">${cfg.responsavel_tecnico_cargo || 'Responsável Técnico'}</div>
      ${cfg.responsavel_tecnico_registro ? `<div class="sig-reg">Nº Registro: ${cfg.responsavel_tecnico_registro}</div>` : ''}
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    <strong>Centro de Informações Toxicológicas: 0800-643-5252</strong><br/>
    ${cfg.alvara_sanitario || cfg.alvara_licenca || cfg.certificado_registro ? `
    <div class="rodape-alvaras">
      ${cfg.alvara_sanitario ? `<span class="alvara-badge">Alvará Sanitário Nº ${cfg.alvara_sanitario}</span>` : ''}
      ${cfg.alvara_licenca ? `<span class="alvara-badge">Alvará de Licença Nº ${cfg.alvara_licenca}</span>` : ''}
      ${cfg.certificado_registro ? `<span class="alvara-badge">Cert. de Registro Nº ${cfg.certificado_registro}</span>` : ''}
    </div>` : ''}
  </div>

</div>
</body>
</html>`

  const pdfFilename = `certificate-${certificado.numero_certificado || 'certificado'}-${Date.now()}.pdf`
  await openAsPdf(htmlContent, pdfFilename)
}