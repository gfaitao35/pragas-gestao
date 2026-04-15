'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, X, Loader2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'

interface OrdemServico {
  id: string
  numero_os: string
  tipo_servico: string
  data_execucao: string
  cliente?: { razao_social: string }
}

const TEXTO_PADRAO = (nomeEmpresa: string, cnpj: string, data: string, servico: string, cliente: string, endereco: string) =>
`A empresa ${nomeEmpresa}, inscrita no CNPJ nº ${cnpj}, realizou no dia ${data} o ${servico} no estabelecimento do(a) ${cliente}, localizado à ${endereco}, conforme solicitado.

Os serviços foram realizados utilizando produtos devidamente registrados no Ministério da Saúde / ANVISA, aplicados por profissionais treinados e habilitados, seguindo rigorosamente as normas técnicas e de segurança vigentes, sem oferecer riscos à saúde humana, animal ou ao meio ambiente quando utilizados conforme orientação técnica.

Foram adotadas medidas de controle integrado de pragas (MIP), incluindo:
- Aplicação de inseticidas e raticidas nos pontos estratégicos;
- Orientações ao cliente quanto à higienização e manejo adequado de resíduos;
- Vedação de possíveis pontos de acesso das pragas;
- Monitoramento periódico do ambiente.

Recomenda-se a manutenção do controle preventivo a cada [30/60/90] dias, conforme o nível de infestação e as características do local.

Este laudo tem como finalidade comprovar a realização do serviço técnico especializado, estando o local apto para funcionamento dentro das condições sanitárias exigidas pelos órgãos competentes.

Emitimos o presente laudo para fins de comprovação junto aos órgãos de fiscalização e demais interessados.`

import { ModuleLock } from '@/components/module-lock'

export default function NovoLaudoPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null)
  const [texto, setTexto] = useState('')
  const [imagens, setImagens] = useState<string[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingOrdem, setLoadingOrdem] = useState(false)
  const [empresaData, setEmpresaData] = useState<any>(null)

  useEffect(() => {
    fetchOrdens()
    fetchEmpresa()
  }, [])

  const fetchOrdens = async () => {
    try {
      const res = await fetch('/api/ordens?status=concluida&limit=100')
      if (res.ok) {
        const data = await res.json()
        setOrdens(data.ordens || data || [])
      }
    } catch { toast.error('Erro ao carregar ordens') }
  }

  const fetchEmpresa = async () => {
    try {
      const [resEmp, resCfg] = await Promise.all([fetch('/api/user/empresa'), fetch('/api/user/config')])
      const emp = resEmp.ok ? await resEmp.json() : {}
      const cfg = resCfg.ok ? await resCfg.json() : {}
      setEmpresaData({ ...emp, ...cfg })
    } catch {}
  }

  const handleOrdemChange = async (ordemId: string) => {
    setLoadingOrdem(true)
    try {
      const res = await fetch(`/api/ordens/${ordemId}`)
      if (res.ok) {
        const ordem = await res.json()
        setOrdemSelecionada(ordem)

        // Preenche o texto base com os dados da OS
        const nomeEmpresa = empresaData?.nomeFantasia || empresaData?.nome_empresa || 'Empresa'
        const cnpj = empresaData?.cnpj ? formatCNPJ(empresaData.cnpj) : 'XX.XXX.XXX/XXXX-XX'
        const data = ordem.data_execucao
          ? new Date(ordem.data_execucao + 'T12:00:00').toLocaleDateString('pt-BR')
          : '[data]'
        const servico = ordem.tipo_servico || '[serviço]'
        const cliente = ordem.cliente?.razao_social || '[cliente]'
        const endereco = [ordem.cliente?.endereco, ordem.cliente?.cidade, ordem.cliente?.estado].filter(Boolean).join(', ') || '[endereço]'

        setTexto(TEXTO_PADRAO(nomeEmpresa, cnpj, data, servico, cliente, endereco))
      }
    } catch { toast.error('Erro ao carregar OS') }
    finally { setLoadingOrdem(false) }
  }

  const handleUploadImages = async (files: FileList) => {
    const novosArquivos = Array.from(files)
    for (let i = 0; i < novosArquivos.length; i++) {
      const file = novosArquivos[i]
      setUploadingIdx(imagens.length + i)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/uploads', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          setImagens(prev => [...prev, url])
        } else {
          toast.error(`Erro ao enviar ${file.name}`)
        }
      } catch { toast.error(`Erro ao enviar ${file.name}`) }
      finally { setUploadingIdx(null) }
    }
  }

  const handleRemoveImagem = (idx: number) => {
    setImagens(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!ordemSelecionada) { toast.error('Selecione uma OS'); return }
    if (!texto.trim()) { toast.error('O texto do laudo é obrigatório'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/laudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordem_servico_id: ordemSelecionada.id,
          texto: texto.trim(),
          imagens,
        }),
      })
      if (res.ok) {
        const { id } = await res.json()
        toast.success('Laudo criado com sucesso!')
        router.push(`/dashboard/laudos/${id}`)
      } else {
        toast.error('Erro ao criar laudo')
      }
    } catch { toast.error('Erro ao criar laudo') }
    finally { setSaving(false) }
  }

  return (
    <ModuleLock modulo="laudos" nomeModulo="Laudos Técnicos">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/laudos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Laudo Técnico</h1>
          <p className="text-muted-foreground">Preencha os dados e adicione as fotos do serviço</p>
        </div>
      </div>

      <div className="grid gap-6">

        {/* SELEÇÃO DE OS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ordem de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Selecione a OS vinculada</Label>
            <Select onValueChange={handleOrdemChange} disabled={loadingOrdem}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOrdem ? 'Carregando...' : 'Selecionar OS...'} />
              </SelectTrigger>
              <SelectContent>
                {ordens.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.numero_os} — {o.cliente?.razao_social || 'Cliente'} ({o.tipo_servico})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ordemSelecionada && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">OS:</span> {ordemSelecionada.numero_os}</p>
                <p><span className="font-medium">Cliente:</span> {(ordemSelecionada as any).cliente?.razao_social}</p>
                <p><span className="font-medium">Serviço:</span> {ordemSelecionada.tipo_servico}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TEXTO DO LAUDO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Texto do Laudo</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="min-h-[360px] font-mono text-sm leading-relaxed resize-y"
              placeholder="Selecione uma OS acima para preencher o texto automaticamente, ou digite aqui..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Você pode editar livremente o texto acima.
            </p>
          </CardContent>
        </Card>

        {/* UPLOAD DE IMAGENS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fotos do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleUploadImages(e.dataTransfer.files) }}
            >
              <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Clique para adicionar fotos</p>
              <p className="text-xs text-muted-foreground mt-1">ou arraste e solte aqui · JPG, PNG, JPEG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleUploadImages(e.target.files)}
              />
            </div>

            {imagens.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {imagens.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => handleRemoveImagem(idx)}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </div>
                  </div>
                ))}
                {uploadingIdx !== null && (
                  <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {imagens.length > 0 && (
              <p className="text-sm text-muted-foreground">{imagens.length} foto(s) adicionada(s)</p>
            )}
          </CardContent>
        </Card>

        {/* AÇÕES */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/laudos">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={saving || !ordemSelecionada}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? 'Salvando...' : 'Criar Laudo'}
          </Button>
        </div>
      </div>
    </div>
    </ModuleLock>
  )
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return cnpj
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}