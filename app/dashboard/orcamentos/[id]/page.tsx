'use client'

import { Loader2, ArrowLeft, Plus, Trash2, FileDown, Save, Search, UserPlus, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { generateOrcamentoPDF } from '@/lib/pdf-orcamento'
import type { Orcamento, DadosEmpresa, DadosCliente, Procedimento, StatusOrcamento } from '@/types/orcamento'

const newId = () => crypto.randomUUID()

function normalizeImageUrl(url: string): string {
  if (!url) return ''
  // URLs absolutas (Vercel Blob) já estão prontas
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/')) return url.replace('/uploads/', '/api/file/')
  return url
}

// Busca a logo como base64 via API — funciona em dev e no Electron empacotado
async function resolveLogoUrl(url: string): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  // URLs absolutas (Vercel Blob): faz fetch direto e converte para base64
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = res.headers.get('content-type') || 'image/png'
        return `data:${contentType};base64,${buffer.toString('base64')}`
      }
    } catch {}
    return url
  }
  try {
    const apiUrl = url.startsWith('/uploads/')
      ? url.replace('/uploads/', '/api/file/')
      : url
    const filename = apiUrl.replace(/^\/api\/file\//, '')
    const res = await fetch(`/api/file/${filename}?base64=1`)
    if (res.ok) {
      const json = await res.json()
      return json.dataUrl || url
    }
  } catch {}
  return url
}

const defaultConsideracoes = [
  'Orçamento válido por 10 dias após envio',
  'Procedimento realizado apenas na presença de responsável ou autorizado',
]

export default function OrcamentoFormPage() {
  const { id } = useParams<{ id: string }>()
  const idParam = id as string
  const isNovo = idParam === 'novo'

  const router = useRouter()
  const { toast } = useToast()

  const [empresa, setEmpresa] = useState<DadosEmpresa>({
    nomeFantasia: '',
    razaoSocial: '',
    cnpj: '',
    email: '',
    nomeCompleto: '',
    logo: '',
  })

  const [loadingEmpresa, setLoadingEmpresa] = useState(true)
  const [cliente, setCliente] = useState<DadosCliente>({
    nome: '',
    contato: '',
    endereco: '',
    cidade: '',
    estado: '',
  })
  const [clienteMode, setClienteMode] = useState<'novo' | 'existente'>('novo')
  const [clientesDB, setClientesDB] = useState<any[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clienteBusca, setClienteBusca] = useState('')
  const [showClienteList, setShowClienteList] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)

  const [servicos, setServicos] = useState<any[]>([])
  const [loadingServicos, setLoadingServicos] = useState(false)
  const [tituloServico, setTituloServico] = useState('')
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([
    { id: newId(), titulo: '', descricao: '' },
  ])
  const [garantia, setGarantia] = useState('06 meses')
  const [valor, setValor] = useState(0)
  const [formasPagamento, setFormasPagamento] = useState<string[]>([
    'À vista 5% de desconto',
  ])
  const [consideracoes, setConsideracoes] =
    useState<string[]>(defaultConsideracoes)
  const [diasValidade, setDiasValidade] = useState(10)
  const [dataOrcamento, setDataOrcamento] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [numero, setNumero] = useState(0)
  const [orcId, setOrcId] = useState<string>(isNovo ? newId() : idParam)
  const [status, setStatus] = useState<StatusOrcamento>('rascunho')

  useEffect(() => {
    async function loadDadosEmpresa() {
      setLoadingEmpresa(true)
      try {
        const resUser = await fetch('/api/user/empresa')
        let userData: any = {}
        if (resUser.ok) {
          userData = await resUser.json()
        }

        let logo = ''

        // Busca os dois templates em paralelo — logo SEMPRE vem do template OS
        const [resOrc, resOs] = await Promise.all([
          fetch('/api/templates?tipo=orcamento'),
          fetch('/api/templates?tipo=os'),
        ])
        const tOrc = resOrc.ok ? await resOrc.json() : null
        const tOs  = resOs.ok  ? await resOs.json()  : null

        const logoUrl = tOs?.logo_url || tOrc?.logo_url || ''
        const t = tOrc || tOs
        const nomeEmpresaFallback = t?.nome_empresa || ''

        setEmpresa({
          nomeFantasia: userData.nomeFantasia || nomeEmpresaFallback || '',
          razaoSocial: userData.razaoSocial || '',
          cnpj: userData.cnpj || '',
          email: userData.email || '',
          nomeCompleto: userData.nomeCompleto || '',
          logo: await resolveLogoUrl(logoUrl),
        })
      } catch (err) {
        console.error('Erro ao carregar dados da empresa:', err)
        toast({
          title: 'Não foi possível carregar dados da empresa',
          description: 'Verifique se há template configurado.',
          variant: 'destructive',
        })
      } finally {
        setLoadingEmpresa(false)
      }
    }

    loadDadosEmpresa()
    loadServicos()
    loadClientes()

    const stored = localStorage.getItem('orcamentos')
    const lista: Orcamento[] = stored ? JSON.parse(stored) : []

    if (!isNovo) {
      const existing = lista.find((o) => o.id === idParam)
      if (existing) {
        setOrcId(existing.id)
        setNumero(existing.numero)
        setDataOrcamento(existing.data)
        setStatus(existing.status)
        setEmpresa((prev) => ({ ...prev, ...existing.empresa }))
        setCliente(existing.cliente)
        setTituloServico(existing.tituloServico)
        setProcedimentos(
          existing.procedimentos.length
            ? existing.procedimentos
            : [{ id: newId(), titulo: '', descricao: '' }],
        )
        setGarantia(existing.garantia)
        setValor(existing.valorInvestimento)
        setFormasPagamento(existing.formasPagamento || [])
        setConsideracoes(existing.consideracoes || defaultConsideracoes)
        setDiasValidade(existing.diasValidade)
      } else {
        setNumero(Date.now())
      }
    } else {
      setNumero(Date.now())
    }
  }, [idParam, isNovo, toast])

  async function loadServicos() {
    try {
      setLoadingServicos(true)
      const res = await fetch('/api/servicos')
      if (res.ok) {
        const data = await res.json()
        setServicos(data)
      }
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
    } finally {
      setLoadingServicos(false)
    }
  }

  async function loadClientes() {
    try {
      setLoadingClientes(true)
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setClientesDB(data)
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoadingClientes(false)
    }
  }

  function handleSelectCliente(clienteDB: any) {
    setSelectedClienteId(clienteDB.id)
    setCliente({
      nome: clienteDB.razao_social || clienteDB.nome_fantasia || '',
      contato: clienteDB.telefone || clienteDB.contato_responsavel || '',
      endereco: clienteDB.endereco || '',
      cidade: clienteDB.cidade || '',
      estado: clienteDB.estado || '',
    })
    setClienteBusca(clienteDB.razao_social || clienteDB.nome_fantasia || '')
    setShowClienteList(false)
  }

  const filteredClientes = clientesDB.filter((c) => {
    const search = clienteBusca.toLowerCase()
    return (
      (c.razao_social && c.razao_social.toLowerCase().includes(search)) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(search)) ||
      (c.cnpj && c.cnpj.includes(search)) ||
      (c.cpf && c.cpf.includes(search))
    )
  })

  function handleSelectServico(servicoId: string) {
    const servico = servicos.find((s) => s.id === servicoId)
    if (servico) {
      setTituloServico(servico.nome)
      const descAuto = servico.descricao_orcamento || servico.descricao
      // titulo do procedimento fica vazio quando igual ao tituloServico — evita duplicata no PDF
      if (procedimentos.length === 1 && !procedimentos[0].titulo && !procedimentos[0].descricao) {
        setProcedimentos([{ id: newId(), titulo: '', descricao: descAuto }])
      } else {
        setProcedimentos((prev) => [
          ...prev,
          { id: newId(), titulo: '', descricao: descAuto },
        ])
      }
    }
  }

  function buildOrcamento(
    newStatus: StatusOrcamento = 'rascunho',
  ): Orcamento {
    return {
      id: orcId,
      numero,
      data: dataOrcamento,
      status: newStatus,
      empresa,
      cliente,
      tituloServico,
      procedimentos,
      garantia,
      valorInvestimento: valor,
      formasPagamento,
      consideracoes,
      diasValidade,
    }
  }

  function persistOrcamento(orc: Orcamento) {
    const stored = localStorage.getItem('orcamentos')
    const lista: Orcamento[] = stored ? JSON.parse(stored) : []
    const idx = lista.findIndex((o) => o.id === orc.id)
    if (idx >= 0) {
      lista[idx] = orc
    } else {
      lista.push(orc)
    }
    localStorage.setItem('orcamentos', JSON.stringify(lista))
  }

  function handleSave() {
    const orc = buildOrcamento(status)
    persistOrcamento(orc)
    toast({ title: 'Orçamento salvo com sucesso!' })
    router.push('/dashboard/orcamentos')
  }

  function handleGerarPdf() {
    const orc = buildOrcamento(status)
    generateOrcamentoPDF(orc)
    toast({ title: 'PDF gerado com sucesso!' })
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      setEmpresa((prev) => ({ ...prev, logo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function addProcedimento() {
    setProcedimentos((p) => [...p, { id: newId(), titulo: '', descricao: '' }])
  }

  function removeProcedimento(pid: string) {
    setProcedimentos((p) => p.filter((x) => x.id !== pid))
  }

  function updateProcedimento(
    pid: string,
    field: keyof Procedimento,
    val: string,
  ) {
    setProcedimentos((p) =>
      p.map((x) => (x.id === pid ? { ...x, [field]: val } : x)),
    )
  }

  function addFormaPagamento() {
    setFormasPagamento((f) => [...f, ''])
  }

  function removeFormaPagamento(idx: number) {
    setFormasPagamento((f) => f.filter((_, i) => i !== idx))
  }

  function addConsideracao() {
    setConsideracoes((c) => [...c, ''])
  }

  function removeConsideracao(idx: number) {
    setConsideracoes((c) => c.filter((_, i) => i !== idx))
  }

  if (loadingEmpresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">
          Carregando dados da empresa...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGerarPdf}>
              <FileDown className="mr-2 h-4 w-4" /> Gerar PDF
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          {isNovo ? `Novo Orçamento #${numero}` : `Editar Orçamento #${numero}`}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {empresa.logo && (
              <div className="sm:col-span-2 lg:col-span-1">
                <img
                  src={normalizeImageUrl(empresa.logo)}
                  alt="Logo da empresa"
                  className="mt-2 max-h-24 rounded border bg-white p-2 object-contain"
                />
              </div>
            )}

            <div>
              <Label className="text-sm text-muted-foreground">
                Nome Fantasia
              </Label>
              <p className="mt-1 font-medium">
                {empresa.nomeFantasia || '—'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Razão Social
              </Label>
              <p className="mt-1 font-medium">{empresa.razaoSocial || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">CNPJ</Label>
              <p className="mt-1 font-medium">{empresa.cnpj || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="mt-1 font-medium">{empresa.email || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Responsável
              </Label>
              <p className="mt-1 font-medium">
                {empresa.nomeCompleto || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle: Cliente novo / existente */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={clienteMode === 'novo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setClienteMode('novo')
                  setSelectedClienteId(null)
                  setClienteBusca('')
                  setCliente({ nome: '', contato: '', endereco: '', cidade: '', estado: '' })
                }}
                className="flex-1"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Cliente novo
              </Button>
              <Button
                type="button"
                variant={clienteMode === 'existente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setClienteMode('existente')
                  setSelectedClienteId(null)
                  setClienteBusca('')
                }}
                className="flex-1"
              >
                <Users className="mr-2 h-4 w-4" />
                Cliente ja existente
              </Button>
            </div>

            {/* Search for existing clients */}
            {clienteMode === 'existente' && (
              <div className="relative">
                <Label className="text-sm font-medium">Buscar cliente cadastrado</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Digite o nome, CNPJ ou CPF do cliente..."
                    value={clienteBusca}
                    onChange={(e) => {
                      setClienteBusca(e.target.value)
                      setShowClienteList(true)
                      setSelectedClienteId(null)
                    }}
                    onFocus={() => setShowClienteList(true)}
                    className="pl-9"
                  />
                </div>
                {showClienteList && clienteBusca.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
                    {loadingClientes ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                      </div>
                    ) : filteredClientes.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                      </div>
                    ) : (
                      filteredClientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                          onClick={() => handleSelectCliente(c)}
                        >
                          <span className="font-medium text-sm">{c.razao_social}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.cnpj || c.cpf || ''}
                            {c.cidade ? ` - ${c.cidade}/${c.estado}` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedClienteId && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium">
                    Cliente selecionado - campos preenchidos automaticamente
                  </p>
                )}
              </div>
            )}

            {/* Client fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={cliente.nome}
                  onChange={(e) =>
                    setCliente({ ...cliente, nome: e.target.value })
                  }
                  readOnly={clienteMode === 'existente' && !!selectedClienteId}
                  className={clienteMode === 'existente' && selectedClienteId ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label>Contato / Telefone</Label>
                <Input
                  value={cliente.contato}
                  onChange={(e) =>
                    setCliente({ ...cliente, contato: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Endereco</Label>
                <Input
                  value={cliente.endereco}
                  onChange={(e) =>
                    setCliente({ ...cliente, endereco: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input
                  value={cliente.cidade}
                  onChange={(e) =>
                    setCliente({ ...cliente, cidade: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF)</Label>
                <Input
                  value={cliente.estado}
                  onChange={(e) =>
                    setCliente({ ...cliente, estado: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {servicos.length > 0 && (
              <div className="space-y-1">
                <Label>Selecionar Serviço Cadastrado</Label>
                <Select onValueChange={handleSelectServico} disabled={loadingServicos}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um serviço para preencher automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((servico) => (
                      <SelectItem key={servico.id} value={servico.id}>
                        {servico.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Título do Serviço</Label>
              <Input
                placeholder="Ex: Controle de Roedores (Desratização)..."
                value={tituloServico}
                onChange={(e) => setTituloServico(e.target.value)}
              />
            </div>
            <Separator />
            <Label className="text-sm font-semibold">Procedimentos</Label>
            {procedimentos.map((p, idx) => (
              <div key={p.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Procedimento {idx + 1}
                  </span>
                  {procedimentos.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeProcedimento(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Título"
                  value={p.titulo}
                  onChange={(e) =>
                    updateProcedimento(p.id, 'titulo', e.target.value)
                  }
                />
                <Textarea
                  placeholder="Descrição detalhada"
                  value={p.descricao}
                  onChange={(e) =>
                    updateProcedimento(p.id, 'descricao', e.target.value)
                  }
                  rows={24}
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addProcedimento}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Procedimento
            </Button>
            <Separator />
            <div className="space-y-1">
              <Label>Garantia</Label>
              <Input
                value={garantia}
                onChange={(e) => setGarantia(e.target.value)}
                placeholder="Ex: 06 meses"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Investimento e Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Valor do Investimento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={valor || ''}
                onChange={(e) =>
                  setValor(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <Separator />
            <Label className="text-sm font-semibold">
              Formas de Pagamento
            </Label>
            {formasPagamento.map((fp, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={fp}
                  onChange={(e) => {
                    const copy = [...formasPagamento]
                    copy[idx] = e.target.value
                    setFormasPagamento(copy)
                  }}
                  placeholder="Ex: À vista 5% de desconto"
                />
                {formasPagamento.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFormaPagamento(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFormaPagamento}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Forma
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Considerações Finais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {consideracoes.map((c, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={c}
                  onChange={(e) => {
                    const copy = [...consideracoes]
                    copy[idx] = e.target.value
                    setConsideracoes(copy)
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeConsideracao(idx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addConsideracao}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Consideração
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Data do Orçamento</Label>
              <Input
                type="date"
                value={dataOrcamento}
                onChange={(e) => setDataOrcamento(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Dias de Validade</Label>
              <Input
                type="number"
                min={1}
                value={diasValidade}
                onChange={(e) =>
                  setDiasValidade(parseInt(e.target.value) || 10)
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" onClick={handleGerarPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Gerar PDF
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Salvar Orçamento
          </Button>
        </div>
      </div>
    </div>
  )
}