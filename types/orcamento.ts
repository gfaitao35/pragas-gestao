export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

export interface DadosEmpresa {
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  email: string
  nomeCompleto: string
  logo?: string
}

export interface DadosCliente {
  nome: string
  contato: string
  endereco: string
  cidade: string
  estado: string
}

export interface Procedimento {
  id: string
  titulo: string
  descricao: string
}

export interface Orcamento {
  id: string
  numero: number
  data: string
  status: StatusOrcamento
  empresa: DadosEmpresa
  cliente: DadosCliente
  tituloServico: string
  procedimentos: Procedimento[]
  garantia: string
  valorInvestimento: number
  formasPagamento: string[]
  consideracoes: string[]
  diasValidade: number
}

