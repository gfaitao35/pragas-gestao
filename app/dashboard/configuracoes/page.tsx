'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Save,
  UserCheck,
  Shield,
  FileText,
  Phone,
  MessageSquare,
  Palette,
  Settings,
  Plus,
  Trash2,
  Edit,
  LayoutTemplate as _LayoutTemplate,
  PenTool,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Servico } from '@/lib/types'

type AssinaturaTipo = 'nenhuma' | 'fisica' | 'digital'

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
  cor_sistema: string
  assinatura_legal_tipo: AssinaturaTipo
  assinatura_legal_url: string
  assinatura_tecnico_tipo: AssinaturaTipo
  assinatura_tecnico_url: string
  logo_url: string
}

const defaultConfig: EmpresaConfig = {
  responsavel_legal_nome: '',
  responsavel_legal_cargo: '',
  responsavel_legal_cpf: '',
  responsavel_tecnico_nome: '',
  responsavel_tecnico_registro: '',
  responsavel_tecnico_cargo: '',
  alvara_sanitario: '',
  alvara_licenca: '',
  certificado_registro: '',
  observacoes_padrao: '',
  telefone: '',
  cor_sistema: '#ea580c',
  assinatura_legal_tipo: 'nenhuma',
  assinatura_legal_url: '',
  assinatura_tecnico_tipo: 'nenhuma',
  assinatura_tecnico_url: '',
  logo_url: '',
}


function normalizeImageUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/uploads/')) return url.replace('/uploads/', '/api/file/')
  return url
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('empresa')
  const [config, setConfig] = useState<EmpresaConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loadingServicos, setLoadingServicos] = useState(true)
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [servicoForm, setServicoForm] = useState({ nome: '', descricao: '', descricao_orcamento: '', observacoes_certificado: '', pragas_alvo: '[]', praga_alvo_auto: false, ordem: 0 })
  const [novaPraga, setNovaPraga] = useState('')

  useEffect(() => {
    loadConfig()
    loadServicos()
  }, [])

  async function loadConfig() {
    try {
      const res = await fetch('/api/user/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

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

  const [uploadingSignature, setUploadingSignature] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [savingLogo, setSavingLogo] = useState(false)

  useEffect(() => {
    fetch('/api/templates?tipo=os')
      .then(r => r.ok ? r.json() : null)
      .then(t => { if (t?.logo_url) setLogoUrl(t.logo_url) })
      .catch(() => {})
  }, [])

  const handleChange = (field: keyof EmpresaConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleSignatureUpload = async (
    file: File,
    urlField: 'assinatura_legal_url' | 'assinatura_tecnico_url'
  ) => {
    setUploadingSignature(urlField)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/uploads', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setConfig((prev) => ({ ...prev, [urlField]: data.url }))
        toast.success('Arquivo enviado com sucesso!')
      } else {
        toast.error('Erro ao enviar arquivo')
      }
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploadingSignature(null)
    }
  }

  const handleLogoUpload = async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG, WEBP ou SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.')
      return
    }
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/uploads', { method: 'POST', body: formData })
      if (!uploadRes.ok) { toast.error('Erro ao enviar arquivo'); return }
      const { url } = await uploadRes.json()
      setLogoUrl(url)
      toast.success('Logo carregada! Clique em "Salvar Logo" para confirmar.')
    } catch {
      toast.error('Erro ao enviar logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveLogo = async () => {
    setSavingLogo(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'os', logo_url: logoUrl }),
      })
      if (res.ok) {
        toast.success('Logo salva com sucesso!')
      } else {
        toast.error('Erro ao salvar logo')
      }
    } catch {
      toast.error('Erro ao salvar logo')
    } finally {
      setSavingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setSavingLogo(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'os', logo_url: '' }),
      })
      if (res.ok) {
        setLogoUrl('')
        toast.success('Logo removida.')
      } else {
        toast.error('Erro ao remover logo')
      }
    } catch {
      toast.error('Erro ao remover logo')
    } finally {
      setSavingLogo(false)
    }
  }



  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
          // Salvar cor no localStorage para persistência e aplicar tema globalmente
        if (typeof window !== 'undefined') {
          localStorage.setItem('cor_sistema', config.cor_sistema)
          try {
            // aplica usando util centralizado
            const { applyHexTheme } = await import('@/lib/theme')
            applyHexTheme(config.cor_sistema)
          } catch (err) {
            console.error('Erro ao aplicar tema:', err)
          }
        }

        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  // Aplicar cor quando config carregar
  useEffect(() => {
    if (!loading && config.cor_sistema) {
      ;(async () => {
        try {
          const { applyHexTheme } = await import('@/lib/theme')
          applyHexTheme(config.cor_sistema)
        } catch (err) {
          console.error('Erro ao aplicar tema:', err)
        }
      })()
    }
  }, [config.cor_sistema, loading])

  // Helpers para pragas alvo
  const getPragasList = (): string[] => {
    try { return JSON.parse(servicoForm.pragas_alvo || '[]') } catch { return [] }
  }

  const handleAddPraga = () => {
    const praga = novaPraga.trim()
    if (!praga) return
    const list = getPragasList()
    if (list.includes(praga)) { toast.error('Praga já adicionada'); return }
    setServicoForm(prev => ({ ...prev, pragas_alvo: JSON.stringify([...list, praga]) }))
    setNovaPraga('')
  }

  const handleRemovePraga = (praga: string) => {
    const list = getPragasList().filter(p => p !== praga)
    setServicoForm(prev => ({ ...prev, pragas_alvo: JSON.stringify(list) }))
  }

  const handleSaveServico = async () => {
    try {
      if (editingServico) {
        const res = await fetch('/api/servicos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingServico.id,
            nome: servicoForm.nome,
            descricao: servicoForm.descricao,
            descricao_orcamento: servicoForm.descricao_orcamento,
            observacoes_certificado: servicoForm.observacoes_certificado,
            pragas_alvo: servicoForm.pragas_alvo,
            praga_alvo_auto: servicoForm.praga_alvo_auto,
            ordem: servicoForm.ordem,
            ativo: true,
          }),
        })
        if (res.ok) {
          toast.success('Serviço atualizado com sucesso!')
          setEditingServico(null)
          setServicoForm({ nome: '', descricao: '', descricao_orcamento: '', observacoes_certificado: '', pragas_alvo: '[]', praga_alvo_auto: false, ordem: 0 })
          loadServicos()
        } else {
          toast.error('Erro ao atualizar serviço')
        }
      } else {
        const res = await fetch('/api/servicos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(servicoForm),
        })
        if (res.ok) {
          toast.success('Serviço cadastrado com sucesso!')
          setServicoForm({ nome: '', descricao: '', descricao_orcamento: '', observacoes_certificado: '', pragas_alvo: '[]', praga_alvo_auto: false, ordem: 0 })
          loadServicos()
        } else {
          toast.error('Erro ao cadastrar serviço')
        }
      }
    } catch {
      toast.error('Erro ao salvar serviço')
    }
  }

  const handleDeleteServico = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return
    try {
      const res = await fetch(`/api/servicos?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Serviço excluído com sucesso!')
        loadServicos()
      } else {
        toast.error('Erro ao excluir serviço')
      }
    } catch {
      toast.error('Erro ao excluir serviço')
    }
  }

  const handleEditServico = (servico: Servico) => {
    setEditingServico(servico)
    setServicoForm({
      nome: servico.nome,
      descricao: servico.descricao,
      descricao_orcamento: servico.descricao_orcamento || '',
      observacoes_certificado: servico.observacoes_certificado || '',
      pragas_alvo: servico.pragas_alvo || '[]',
      praga_alvo_auto: servico.praga_alvo_auto || false,
      ordem: servico.ordem,
    })
    setNovaPraga('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure os dados da empresa, serviços oferecidos, templates e aparência do sistema.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Responsavel Legal</CardTitle>
              </div>
              <CardDescription>Responsavel legal da empresa, que assinara os documentos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rl_nome">Nome Completo</Label>
                <Input
                  id="rl_nome"
                  value={config.responsavel_legal_nome}
                  onChange={(e) => handleChange('responsavel_legal_nome', e.target.value)}
                  placeholder="Ex: Joao da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rl_cargo">Cargo</Label>
                <Input
                  id="rl_cargo"
                  value={config.responsavel_legal_cargo}
                  onChange={(e) => handleChange('responsavel_legal_cargo', e.target.value)}
                  placeholder="Ex: Diretor / Proprietario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rl_cpf">CPF</Label>
                <Input
                  id="rl_cpf"
                  value={config.responsavel_legal_cpf}
                  onChange={(e) => handleChange('responsavel_legal_cpf', e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Responsavel Tecnico</CardTitle>
              </div>
              <CardDescription>
                Quimico responsavel que assinara certificados e documentos tecnicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rt_nome">Nome Completo</Label>
                <Input
                  id="rt_nome"
                  value={config.responsavel_tecnico_nome}
                  onChange={(e) => handleChange('responsavel_tecnico_nome', e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt_registro">Registro (CRQ)</Label>
                <Input
                  id="rt_registro"
                  value={config.responsavel_tecnico_registro}
                  onChange={(e) => handleChange('responsavel_tecnico_registro', e.target.value)}
                  placeholder="Ex: CRQ-XX 00XXXXX"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rt_cargo">Cargo</Label>
                <Input
                  id="rt_cargo"
                  value={config.responsavel_tecnico_cargo}
                  onChange={(e) => handleChange('responsavel_tecnico_cargo', e.target.value)}
                  placeholder="Ex: Quimico Responsavel"
                />
              </div>
            </CardContent>
          </Card>

          {/* Assinaturas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Assinaturas para Certificados</CardTitle>
              </div>
              <CardDescription>
                Configure as assinaturas do responsavel legal e tecnico que aparecerao nos certificados PDF.
                Escolha entre assinatura fisica (imagem PNG) ou digital (arquivo de certificado).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assinatura Responsavel Legal */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Assinatura - Responsavel Legal
                </h4>
                <RadioGroup
                  value={config.assinatura_legal_tipo}
                  onValueChange={(val) => handleChange('assinatura_legal_tipo', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="nenhuma" id="legal-nenhuma" />
                    <Label htmlFor="legal-nenhuma" className="cursor-pointer text-sm">Nenhuma</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fisica" id="legal-fisica" />
                    <Label htmlFor="legal-fisica" className="cursor-pointer text-sm">Fisica (Imagem PNG)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="digital" id="legal-digital" />
                    <Label htmlFor="legal-digital" className="cursor-pointer text-sm">Digital (Certificado)</Label>
                  </div>
                </RadioGroup>

                {config.assinatura_legal_tipo !== 'nenhuma' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = config.assinatura_legal_tipo === 'fisica' ? 'image/png,image/jpeg,image/webp' : '.pfx,.p12,.pem,.cer,.crt'
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) handleSignatureUpload(file, 'assinatura_legal_url')
                          }
                          input.click()
                        }}
                        disabled={uploadingSignature === 'assinatura_legal_url'}
                      >
                        {uploadingSignature === 'assinatura_legal_url' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {config.assinatura_legal_tipo === 'fisica' ? 'Enviar Imagem' : 'Enviar Certificado'}
                      </Button>
                      {config.assinatura_legal_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChange('assinatura_legal_url', '')}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                    {config.assinatura_legal_url && config.assinatura_legal_tipo === 'fisica' && (
                      <div className="rounded-md border bg-muted/30 p-3 flex items-center gap-3">
                        <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <img
                            src={normalizeImageUrl(config.assinatura_legal_url)}
                            alt="Assinatura Responsavel Legal"
                            className="max-h-16 object-contain"
                          />
                        </div>
                      </div>
                    )}
                    {config.assinatura_legal_url && config.assinatura_legal_tipo === 'digital' && (
                      <div className="rounded-md border bg-muted/30 p-3 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">
                          Certificado digital carregado: {config.assinatura_legal_url.split('/').pop()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assinatura Responsavel Tecnico */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Assinatura - Responsavel Tecnico
                </h4>
                <RadioGroup
                  value={config.assinatura_tecnico_tipo}
                  onValueChange={(val) => handleChange('assinatura_tecnico_tipo', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="nenhuma" id="tecnico-nenhuma" />
                    <Label htmlFor="tecnico-nenhuma" className="cursor-pointer text-sm">Nenhuma</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fisica" id="tecnico-fisica" />
                    <Label htmlFor="tecnico-fisica" className="cursor-pointer text-sm">Fisica (Imagem PNG)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="digital" id="tecnico-digital" />
                    <Label htmlFor="tecnico-digital" className="cursor-pointer text-sm">Digital (Certificado)</Label>
                  </div>
                </RadioGroup>

                {config.assinatura_tecnico_tipo !== 'nenhuma' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = config.assinatura_tecnico_tipo === 'fisica' ? 'image/png,image/jpeg,image/webp' : '.pfx,.p12,.pem,.cer,.crt'
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) handleSignatureUpload(file, 'assinatura_tecnico_url')
                          }
                          input.click()
                        }}
                        disabled={uploadingSignature === 'assinatura_tecnico_url'}
                      >
                        {uploadingSignature === 'assinatura_tecnico_url' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {config.assinatura_tecnico_tipo === 'fisica' ? 'Enviar Imagem' : 'Enviar Certificado'}
                      </Button>
                      {config.assinatura_tecnico_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChange('assinatura_tecnico_url', '')}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                    {config.assinatura_tecnico_url && config.assinatura_tecnico_tipo === 'fisica' && (
                      <div className="rounded-md border bg-muted/30 p-3 flex items-center gap-3">
                        <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <img
                            src={normalizeImageUrl(config.assinatura_tecnico_url)}
                            alt="Assinatura Responsavel Tecnico"
                            className="max-h-16 object-contain"
                          />
                        </div>
                      </div>
                    )}
                    {config.assinatura_tecnico_url && config.assinatura_tecnico_tipo === 'digital' && (
                      <div className="rounded-md border bg-muted/30 p-3 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">
                          Certificado digital carregado: {config.assinatura_tecnico_url.split('/').pop()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Alvaras e Registros</CardTitle>
              </div>
              <CardDescription>Numeros de alvaras e registros que aparecerao nos certificados.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alvara_sanitario">Alvara Sanitario</Label>
                <Input
                  id="alvara_sanitario"
                  value={config.alvara_sanitario}
                  onChange={(e) => handleChange('alvara_sanitario', e.target.value)}
                  placeholder="Ex: 123/2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alvara_licenca">Alvara de Licenca</Label>
                <Input
                  id="alvara_licenca"
                  value={config.alvara_licenca}
                  onChange={(e) => handleChange('alvara_licenca', e.target.value)}
                  placeholder="Ex: 456/2025"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="certificado_registro">Certificado de Registro</Label>
                <Input
                  id="certificado_registro"
                  value={config.certificado_registro}
                  onChange={(e) => handleChange('certificado_registro', e.target.value)}
                  placeholder="Ex: CR-0001/2025"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Contato</CardTitle>
              </div>
              <CardDescription>Telefone de contato que aparecera nos documentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={config.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Observações e Cuidados Padrão</CardTitle>
              </div>
              <CardDescription>
                Texto padrao que sera pre-preenchido nos certificados. Pode ser alterado individualmente ao criar
                cada certificado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="observacoes_padrao">Texto Padrao</Label>
                <Textarea
                  id="observacoes_padrao"
                  value={config.observacoes_padrao}
                  onChange={(e) => handleChange('observacoes_padrao', e.target.value)}
                  rows={28}
                  placeholder="Digite as observacoes e cuidados padrao..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Logo da Empresa</CardTitle>
              </div>
              <CardDescription>
                A logo será exibida nos documentos gerados (OS, Certificados, Laudos). Formatos aceitos: PNG, JPG, WEBP, SVG. Tamanho máximo: 2MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {logoUrl ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 inline-block">
                    <img
                      src={normalizeImageUrl(logoUrl)}
                      alt="Logo da empresa"
                      className="max-h-28 max-w-xs object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo || savingLogo}
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml'
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleLogoUpload(file)
                        }
                        input.click()
                      }}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Trocar Logo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={savingLogo}
                      onClick={handleRemoveLogo}
                    >
                      {savingLogo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                  onClick={() => {
                    if (uploadingLogo) return
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleLogoUpload(file)
                    }
                    input.click()
                  }}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40 group-hover:text-primary/50 mx-auto mb-3 transition-colors" />
                  )}
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    {uploadingLogo ? 'Enviando...' : 'Clique para selecionar a logo'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WEBP ou SVG até 2MB</p>
                </div>
              )}
              {logoUrl && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveLogo} disabled={savingLogo || uploadingLogo} size="lg">
                    {savingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Logo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicos" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Serviços Oferecidos</CardTitle>
              </div>
              <CardDescription>
                Cadastre os serviços que sua empresa oferece. Eles aparecerão como opções nos orçamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 border rounded-lg p-4">
                <div className="space-y-2">
                  <Label htmlFor="servico_nome">Serviço *</Label>
                  <Input
                    id="servico_nome"
                    value={servicoForm.nome}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Controle de Roedores (Desratização)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servico_descricao">Descrição *</Label>
                  <Textarea
                    id="servico_descricao"
                    value={servicoForm.descricao}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Instalação de porta-iscas com iscas raticidas altamente atrativos..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="servico_descricao_orcamento">Descrição para Orçamento</Label>
                  <p className="text-xs text-muted-foreground mb-1">Texto comercial que aparece automaticamente ao selecionar este serviço em um orçamento. Se não preenchido, usa a descrição acima.</p>
                  <Textarea
                    id="servico_descricao_orcamento"
                    value={servicoForm.descricao_orcamento}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, descricao_orcamento: e.target.value }))}
                    placeholder={"Ex:\n1- Inspeção e Diagnóstico\nAvaliação detalhada do ambiente...\n\n2- Execução\nAplicação de produto específico..."}
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="servico_obs_certificado">Observações e Cuidados — Certificado</Label>
                  <p className="text-xs text-muted-foreground mb-1">Aparece automaticamente no certificado gerado para este serviço. Ex: deixar o ambiente arejado por 24h.</p>
                  <Textarea
                    id="servico_obs_certificado"
                    value={servicoForm.observacoes_certificado}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, observacoes_certificado: e.target.value }))}
                    placeholder={"Ex:\nApós a execução do serviço, recomenda-se:\n- Manter o ambiente arejado por no mínimo 24 horas\n- Não limpar as áreas tratadas por 72 horas\n- Em caso de contato com o produto, lavar com água e sabão"}
                    rows={6}
                  />
                </div>

                {/* PRAGAS ALVO */}
                <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Pragas Alvo</Label>
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadastre as pragas que este serviço combate. Ao gerar o certificado, será possível selecionar qual praga foi tratada.
                  </p>

                  {getPragasList().length > 0 && (
                    <div className="flex flex-wrap gap-2 py-1">
                      {getPragasList().map((praga) => (
                        <Badge key={praga} variant="secondary" className="gap-1 pr-1">
                          {praga}
                          <button
                            type="button"
                            onClick={() => handleRemovePraga(praga)}
                            className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={novaPraga}
                      onChange={(e) => setNovaPraga(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPraga() } }}
                      placeholder="Ex: Ratos, Baratas, Formigas..."
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPraga} disabled={!novaPraga.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {getPragasList().length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <div>
                        <p className="text-sm font-medium">Automação de praga alvo</p>
                        <p className="text-xs text-muted-foreground">
                          {getPragasList().length === 1
                            ? `Selecionar "${getPragasList()[0]}" automaticamente ao gerar certificado`
                            : 'Selecionar todas as pragas automaticamente ao gerar certificado'}
                        </p>
                      </div>
                      <Switch
                        checked={servicoForm.praga_alvo_auto}
                        onCheckedChange={(checked) => setServicoForm(prev => ({ ...prev, praga_alvo_auto: checked }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveServico} disabled={!servicoForm.nome || !servicoForm.descricao}>
                    {editingServico ? 'Atualizar' : <><Plus className="mr-2 h-4 w-4" />Adicionar</>}
                  </Button>
                  {editingServico && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingServico(null)
                        setServicoForm({ nome: '', descricao: '', descricao_orcamento: '', observacoes_certificado: '', pragas_alvo: '[]', praga_alvo_auto: false, ordem: 0 })
                        setNovaPraga('')
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {loadingServicos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : servicos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum serviço cadastrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {servicos.map((servico) => (
                    <Card key={servico.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{servico.nome}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{servico.descricao}</p>
                            {servico.descricao_orcamento && (
                              <p className="text-xs text-orange-500 mt-1">✓ Descrição para orçamento configurada</p>
                            )}
                            {servico.observacoes_certificado && (
                              <p className="text-xs text-blue-500 mt-1">✓ Observações para certificado configuradas</p>
                            )}
                            {(() => {
                              try {
                                const pragas = JSON.parse(servico.pragas_alvo || '[]') as string[]
                                if (pragas.length > 0) return (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {pragas.map(p => (
                                      <Badge key={p} variant="outline" className="text-xs py-0">
                                        {p}
                                      </Badge>
                                    ))}
                                    {servico.praga_alvo_auto && (
                                      <Badge className="text-xs py-0 bg-green-100 text-green-700 border-green-300">
                                        Auto
                                      </Badge>
                                    )}
                                  </div>
                                )
                              } catch { return null }
                              return null
                            })()}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditServico(servico)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteServico(servico.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Cor do Sistema</CardTitle>
              </div>
              <CardDescription>
                Escolha a cor principal do sistema. Ela será aplicada em botões, links e elementos de destaque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cor_sistema">Cor Principal</Label>
                <div className="flex gap-4 items-center">
                  <Input
                    id="cor_sistema"
                    type="color"
                    value={config.cor_sistema}
                    onChange={(e) => handleChange('cor_sistema', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.cor_sistema}
                    onChange={(e) => handleChange('cor_sistema', e.target.value)}
                    placeholder="#ea580c"
                    className="max-w-xs"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Exemplo: #ea580c (laranja), #1e40af (azul), #059669 (verde)
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="lg">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Cor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}