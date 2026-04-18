import type { Certificado } from './types'
import { formatDateBRFromYYYYMMDD } from './utils'
import { generateCertificadoPDF } from './pdf-certificado'

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


  // Gera como PDF (igual aos demais documentos do sistema)
  await generateCertificadoPDF(certificado)
}
