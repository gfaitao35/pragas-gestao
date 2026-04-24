'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCertificadoAction } from '@/app/dashboard/certificados/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Zap, Save, Bug } from 'lucide-react'
import { toast } from 'sonner'
import type { OrdemServico, Servico } from '@/lib/types'

interface CertificadoFormProps {
  ordem: OrdemServico
}

// Mapa: nome_servico -> checkboxes padrão
type AutomationMap = Record<string, Partial<{
  dedetizacao: { lambdacialotrina: boolean; alfaCipermetrina: boolean; piretroide: boolean }
  descupinizacao: { fipronil: boolean; imidacloprido: boolean; bifentrina: boolean }
  desratizacao: { flocoumafen: boolean; cumatetrail: boolean; brodifacoum: boolean }
  diluicao1: { diluicao30_45: boolean; diluicao50_100: boolean; diluicao100_200: boolean }
  diluicao2: { diluicao25_50: boolean; diluicao50_100_2: boolean }
  iscagem: { iscagem50_100: boolean; iscagem100_200: boolean; iscagem200_300: boolean }
  pragas_selecionadas: string[]
}>>

interface ServiceData {
  dedetizacao: {
    lambdacialotrina: boolean
    alfaCipermetrina: boolean
    piretroide: boolean
  }
  descupinizacao: {
    fipronil: boolean
    imidacloprido: boolean
    bifentrina: boolean
  }
  desratizacao: {
    flocoumafen: boolean
    cumatetrail: boolean
    brodifacoum: boolean
  }
  diluicao1: {
    diluicao30_45: boolean
    diluicao50_100: boolean
    diluicao100_200: boolean
  }
  diluicao2: {
    diluicao25_50: boolean
    diluicao50_100_2: boolean
  }
  iscagem: {
    iscagem50_100: boolean
    iscagem100_200: boolean
    iscagem200_300: boolean
  }
}

const initialServiceData: ServiceData = {
  dedetizacao: {
    lambdacialotrina: false,
    alfaCipermetrina: false,
    piretroide: false,
  },
  descupinizacao: {
    fipronil: false,
    imidacloprido: false,
    bifentrina: false,
  },
  desratizacao: {
    flocoumafen: false,
    cumatetrail: false,
    brodifacoum: false,
  },
  diluicao1: {
    diluicao30_45: false,
    diluicao50_100: false,
    diluicao100_200: false,
  },
  diluicao2: {
    diluicao25_50: false,
    diluicao50_100_2: false,
  },
  iscagem: {
    iscagem50_100: false,
    iscagem100_200: false,
    iscagem200_300: false,
  },
}

export function CertificadoForm({ ordem }: CertificadoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serviceData, setServiceData] = useState<ServiceData>(initialServiceData)
  const [formData, setFormData] = useState({
    numero_certificado: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    observacoes: '',
    observacao_manual: '',
  })

  // Pragas Alvo
  const [pragasDisponiveis, setPragasDisponiveis] = useState<string[]>([])
  const [pragasSelecionadas, setPragasSelecionadas] = useState<string[]>([])
  const [servicoMatchado, setServicoMatchado] = useState<Servico | null>(null)

  // Automação
  const [automationMap, setAutomationMap] = useState<AutomationMap>({})
  const [servicos, setServicos] = useState<Servico[]>([])
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  const [editingServico, setEditingServico] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<ServiceData>(initialServiceData)
  const [editingPragasAuto, setEditingPragasAuto] = useState<string[]>([])
  const [savingAutomation, setSavingAutomation] = useState(false)

  useEffect(() => {
    fetch('/api/certificados/proximo-numero')
      .then(r => r.json())
      .then(data => {
        if (data.numero) {
          setFormData(prev => ({ ...prev, numero_certificado: data.numero }))
        }
      })
      .catch(() => {})

    // Carrega serviços e automação
    Promise.all([
      fetch('/api/servicos').then(r => r.json()),
      fetch('/api/certificados/automation').then(r => r.json()),
    ]).then(([svcs, automation]) => {
      if (Array.isArray(svcs)) {
        setServicos(svcs)

        // Encontra o serviço que corresponde à OS
        const tipoServico = ordem.tipo_servico || ''
        const matched = svcs.find((sv: Servico) =>
          tipoServico.toLowerCase().includes(sv.nome.toLowerCase()) ||
          sv.nome.toLowerCase().includes(tipoServico.toLowerCase())
        )

        if (matched) {
          setServicoMatchado(matched)

          // Carrega pragas disponíveis para este serviço
          try {
            const pragas: string[] = JSON.parse(matched.pragas_alvo || '[]')
            setPragasDisponiveis(pragas)

            // Automação de pragas: se praga_alvo_auto, seleciona todas automaticamente
            if (matched.praga_alvo_auto && pragas.length > 0) {
              setPragasSelecionadas(pragas)
            }
          } catch {
            setPragasDisponiveis([])
          }
        }
      }

      if (automation && typeof automation === 'object') {
        setAutomationMap(automation)

        // Aplica automação de checkboxes se o serviço da OS tem configuração salva
        const tipoServico = ordem.tipo_servico || ''
        const matchKey = Object.keys(automation).find(k =>
          tipoServico.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(tipoServico.toLowerCase())
        )
        if (matchKey && automation[matchKey]) {
          const preset = automation[matchKey] as ServiceData & { pragas_selecionadas?: string[] }
          setServiceData(prev => ({
            dedetizacao: { ...prev.dedetizacao, ...preset.dedetizacao },
            descupinizacao: { ...prev.descupinizacao, ...preset.descupinizacao },
            desratizacao: { ...prev.desratizacao, ...preset.desratizacao },
            diluicao1: { ...prev.diluicao1, ...preset.diluicao1 },
            diluicao2: { ...prev.diluicao2, ...preset.diluicao2 },
            iscagem: { ...prev.iscagem, ...preset.iscagem },
          }))

          // Aplica pragas salvas na automação (só se não tiver praga_alvo_auto do serviço)
          if (preset.pragas_selecionadas && preset.pragas_selecionadas.length > 0) {
            setPragasSelecionadas(prev =>
              prev.length > 0 ? prev : preset.pragas_selecionadas!
            )
          }

          toast.success(`Automação aplicada para "${matchKey}"`)
        }
      }
    }).catch(() => {})
  }, [ordem.tipo_servico])

  const handleCheckboxChange = (path: string, value: boolean) => {
    const keys = path.split('.')
    const newData = JSON.parse(JSON.stringify(serviceData))
    
    let current = newData
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setServiceData(newData)
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePraga = (praga: string) => {
    setPragasSelecionadas(prev =>
      prev.includes(praga) ? prev.filter(p => p !== praga) : [...prev, praga]
    )
  }

  const handleEditingCheckbox = (path: string, value: boolean) => {
    const keys = path.split('.')
    const newData = JSON.parse(JSON.stringify(editingData))
    let current = newData
    for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]]
    current[keys[keys.length - 1]] = value
    setEditingData(newData)
  }

  const openAutomationForServico = (sv: Servico) => {
    setEditingServico(sv.nome)
    const existing = automationMap[sv.nome]
    if (existing) {
      const { pragas_selecionadas, ...checkboxData } = existing as any
      setEditingData({ ...JSON.parse(JSON.stringify(initialServiceData)), ...checkboxData })
      setEditingPragasAuto(pragas_selecionadas || [])
    } else {
      setEditingData(JSON.parse(JSON.stringify(initialServiceData)))
      // Pré-seleciona pragas automaticamente se o serviço tem praga_alvo_auto
      try {
        const pragas: string[] = JSON.parse(sv.pragas_alvo || '[]')
        setEditingPragasAuto(sv.praga_alvo_auto ? pragas : [])
      } catch {
        setEditingPragasAuto([])
      }
    }
  }

  const toggleEditingPraga = (praga: string) => {
    setEditingPragasAuto(prev =>
      prev.includes(praga) ? prev.filter(p => p !== praga) : [...prev, praga]
    )
  }

  const saveAutomation = async () => {
    if (!editingServico) return
    setSavingAutomation(true)
    try {
      const newMap = {
        ...automationMap,
        [editingServico]: {
          ...editingData,
          pragas_selecionadas: editingPragasAuto,
        },
      }
      const res = await fetch('/api/certificados/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMap),
      })
      if (res.ok) {
        setAutomationMap(newMap)
        setEditingServico(null)
        toast.success('Automação salva!')
      }
    } catch {
      toast.error('Erro ao salvar automação')
    } finally {
      setSavingAutomation(false)
    }
  }

  // Retorna as pragas disponíveis do serviço que está sendo editado na automação
  const getEditingServicoPragas = (): string[] => {
    const sv = servicos.find(s => s.nome === editingServico)
    if (!sv) return []
    try { return JSON.parse(sv.pragas_alvo || '[]') } catch { return [] }
  }

  const formatObservacoes = () => {
    const check = (v: boolean) => v ? '( X )' : '(   )'

    // Use JSON to pass structured data so the PDF can render side-by-side
    const structuredData = {
      __structured: true,
      pragas_selecionadas: pragasSelecionadas,
      venenos: [
        {
          titulo: 'Dedetizacao',
          items: [
            `${check(serviceData.dedetizacao.lambdacialotrina)} Lambdacialotrina`,
            `${check(serviceData.dedetizacao.alfaCipermetrina)} Alfa-Cipermetrina`,
            `${check(serviceData.dedetizacao.piretroide)} Piretroide`,
          ],
        },
        {
          titulo: 'Descupinizacao',
          items: [
            `${check(serviceData.descupinizacao.fipronil)} Fipronil`,
            `${check(serviceData.descupinizacao.imidacloprido)} Imidacloprido`,
            `${check(serviceData.descupinizacao.bifentrina)} Bifentrina`,
          ],
        },
        {
          titulo: 'Desratizacao',
          items: [
            `${check(serviceData.desratizacao.flocoumafen)} Flocoumafen`,
            `${check(serviceData.desratizacao.cumatetrail)} Cumatetrail`,
            `${check(serviceData.desratizacao.brodifacoum)} Brodifacoum`,
          ],
        },
      ],
      diluicoes: [
        {
          titulo: 'Diluicao',
          items: [
            `${check(serviceData.diluicao1.diluicao30_45)} 30-45ml/10litros`,
            `${check(serviceData.diluicao1.diluicao50_100)} 50-100ml/10litros`,
            `${check(serviceData.diluicao1.diluicao100_200)} 100-200ml/10litros`,
          ],
        },
        {
          titulo: 'Diluicao (Alt.)',
          items: [
            `${check(serviceData.diluicao2.diluicao25_50)} 25-50ml/10litros`,
            `${check(serviceData.diluicao2.diluicao50_100_2)} 50-100ml/10litros`,
          ],
        },
        {
          titulo: 'Iscagem',
          items: [
            `${check(serviceData.iscagem.iscagem50_100)} 50-100g/10m2`,
            `${check(serviceData.iscagem.iscagem100_200)} 100-200g/10m2`,
            `${check(serviceData.iscagem.iscagem200_300)} 200-300g/10m2`,
          ],
        },
      ],
    }

    return `<!--STRUCTURED_DATA-->${JSON.stringify(structuredData)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const observacoesFormatadas = `${formData.observacoes}\n\nObservacao e Cuidados Especiais\n${formatObservacoes()}<!--OBS_MANUAL-->${formData.observacao_manual}`

      const result = await createCertificadoAction({
        ordem_servico_id: ordem.id,
        numero_certificado: formData.numero_certificado || undefined,
        data_emissao: formData.data_emissao,
        data_validade: formData.data_validade,
        tipo_certificado: ordem.tipo_servico,
        observacoes: observacoesFormatadas,
      })

      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }

      toast.success('Certificado criado com sucesso!')
      router.push('/dashboard/certificados')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao criar certificado')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* BOTÃO AUTOMATIZAR */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAutomationModal(true)}
          className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          <Zap className="h-4 w-4" />
          Configurar Automação
        </Button>
      </div>

      {/* DADOS BÁSICOS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="numero">Número do Certificado</Label>
          <Input
            id="numero"
            value={formData.numero_certificado}
            onChange={(e) => handleFormChange('numero_certificado', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_emissao">Data de Emissão</Label>
          <Input
            id="data_emissao"
            type="date"
            value={formData.data_emissao}
            onChange={(e) => handleFormChange('data_emissao', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_validade">Data de Validade</Label>
          <Input
            id="data_validade"
            type="date"
            value={formData.data_validade}
            onChange={(e) => handleFormChange('data_validade', e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* PRAGAS ALVO — aparece apenas se o serviço tem pragas cadastradas */}
      {pragasDisponiveis.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="h-4 w-4 text-amber-600" />
              Praga(s) Alvo Tratada(s)
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Selecione qual(is) praga(s) foram tratadas neste serviço. Aparecerá no certificado.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pragasDisponiveis.map((praga) => {
                const selecionada = pragasSelecionadas.includes(praga)
                return (
                  <button
                    key={praga}
                    type="button"
                    onClick={() => togglePraga(praga)}
                    disabled={loading}
                    className={`
                      px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer
                      ${selecionada
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-white border-amber-300 text-amber-700 hover:border-amber-400 hover:bg-amber-50'
                      }
                    `}
                  >
                    {selecionada && <span className="mr-1">✓</span>}
                    {praga}
                  </button>
                )
              })}
            </div>
            {pragasSelecionadas.length > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Selecionadas: {pragasSelecionadas.join(', ')}
              </p>
            )}
            {servicoMatchado?.praga_alvo_auto && pragasSelecionadas.length === pragasDisponiveis.length && (
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                  <Zap className="h-3 w-3 mr-1" />
                  Selecionado automaticamente
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DEDETIZAÇÃO E DILUIÇÃO lado a lado */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dedetização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dedetizacao-lambda"
                checked={serviceData.dedetizacao.lambdacialotrina}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('dedetizacao.lambdacialotrina', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="dedetizacao-lambda" className="cursor-pointer text-sm">
                Lambdacialotrina
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dedetizacao-alfa"
                checked={serviceData.dedetizacao.alfaCipermetrina}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('dedetizacao.alfaCipermetrina', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="dedetizacao-alfa" className="cursor-pointer text-sm">
                Alfa-Cipermetrina
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dedetizacao-piretroide"
                checked={serviceData.dedetizacao.piretroide}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('dedetizacao.piretroide', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="dedetizacao-piretroide" className="cursor-pointer text-sm">
                Piretróide
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diluição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diluicao-30-45"
                checked={serviceData.diluicao1.diluicao30_45}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('diluicao1.diluicao30_45', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="diluicao-30-45" className="cursor-pointer text-sm">
                30-45ml/10litros
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diluicao-50-100"
                checked={serviceData.diluicao1.diluicao50_100}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('diluicao1.diluicao50_100', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="diluicao-50-100" className="cursor-pointer text-sm">
                50-100ml/10litros
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diluicao-100-200"
                checked={serviceData.diluicao1.diluicao100_200}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('diluicao1.diluicao100_200', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="diluicao-100-200" className="cursor-pointer text-sm">
                100-200ml/10litros
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DESCUPINIZAÇÃO E DILUIÇÃO 2 lado a lado */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descupinização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="descupinizacao-fipronil"
                checked={serviceData.descupinizacao.fipronil}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('descupinizacao.fipronil', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="descupinizacao-fipronil" className="cursor-pointer text-sm">
                Fipronil
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="descupinizacao-imidacloprido"
                checked={serviceData.descupinizacao.imidacloprido}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('descupinizacao.imidacloprido', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="descupinizacao-imidacloprido" className="cursor-pointer text-sm">
                Imidacloprido
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="descupinizacao-bifentrina"
                checked={serviceData.descupinizacao.bifentrina}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('descupinizacao.bifentrina', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="descupinizacao-bifentrina" className="cursor-pointer text-sm">
                Bifentrina
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diluição (Alternativa)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diluicao2-25-50"
                checked={serviceData.diluicao2.diluicao25_50}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('diluicao2.diluicao25_50', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="diluicao2-25-50" className="cursor-pointer text-sm">
                25-50ml/10litros
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diluicao2-50-100"
                checked={serviceData.diluicao2.diluicao50_100_2}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('diluicao2.diluicao50_100_2', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="diluicao2-50-100" className="cursor-pointer text-sm">
                50-100ml/10litros
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DESRATIZAÇÃO E ISCAGEM lado a lado */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desratização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desratizacao-flocoumafen"
                checked={serviceData.desratizacao.flocoumafen}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('desratizacao.flocoumafen', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="desratizacao-flocoumafen" className="cursor-pointer text-sm">
                Flocoumafen
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desratizacao-cumatetrail"
                checked={serviceData.desratizacao.cumatetrail}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('desratizacao.cumatetrail', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="desratizacao-cumatetrail" className="cursor-pointer text-sm">
                Cumatetrail
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desratizacao-brodifacoum"
                checked={serviceData.desratizacao.brodifacoum}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('desratizacao.brodifacoum', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="desratizacao-brodifacoum" className="cursor-pointer text-sm">
                Brodifacoum
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Iscagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="iscagem-50-100"
                checked={serviceData.iscagem.iscagem50_100}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('iscagem.iscagem50_100', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="iscagem-50-100" className="cursor-pointer text-sm">
                50-100g/10m²
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="iscagem-100-200"
                checked={serviceData.iscagem.iscagem100_200}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('iscagem.iscagem100_200', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="iscagem-100-200" className="cursor-pointer text-sm">
                100-200g/10m²
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="iscagem-200-300"
                checked={serviceData.iscagem.iscagem200_300}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('iscagem.iscagem200_300', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="iscagem-200-300" className="cursor-pointer text-sm">
                200-300g/10m²
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OBSERVAÇÕES AUTOMÁTICAS */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações Adicionais (internas)</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleFormChange('observacoes', e.target.value)}
          placeholder="Adicione observações adicionais..."
          rows={3}
          disabled={loading}
        />
      </div>

      {/* OBSERVAÇÃO MANUAL — aparece no certificado */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📝 Observação
            <span className="text-xs font-normal text-muted-foreground">(aparece no certificado)</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Este texto será exibido no certificado logo abaixo do texto principal.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            id="observacao_manual"
            value={formData.observacao_manual}
            onChange={(e) => handleFormChange('observacao_manual', e.target.value)}
            placeholder="Ex: Retorno garantido em caso de reinfestação. Produto utilizado registrado no MAPA..."
            rows={4}
            disabled={loading}
            className="bg-white"
          />
        </CardContent>
      </Card>

      {/* BOTÃO SUBMIT */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gerar Certificado
        </Button>
      </div>

      {/* MODAL: Lista de serviços para automatizar */}
      <Dialog open={showAutomationModal && !editingServico} onOpenChange={(o) => { if (!o) setShowAutomationModal(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Automação de Checkboxes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione um serviço para configurar quais checkboxes e pragas serão marcados automaticamente ao criar um certificado desse tipo.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {servicos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum serviço cadastrado. Adicione serviços nas Configurações.
              </p>
            )}
            {servicos.map(s => {
              let pragasServico: string[] = []
              try { pragasServico = JSON.parse(s.pragas_alvo || '[]') } catch {}
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => openAutomationForServico(s)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{s.nome}</span>
                    {pragasServico.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pragasServico.map(p => (
                          <Badge key={p} variant="outline" className="text-xs py-0 px-1.5">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {automationMap[s.nome] && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Configurado</span>
                    )}
                    <span className="text-xs text-muted-foreground">Editar →</span>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutomationModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Editar checkboxes padrão para um serviço */}
      <Dialog open={!!editingServico} onOpenChange={(o) => { if (!o) setEditingServico(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Automação para: {editingServico}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Marque os checkboxes que devem vir selecionados automaticamente.</p>

          {/* Pragas automáticas — só aparece se o serviço tem pragas */}
          {(() => {
            const pragasDoServico = getEditingServicoPragas()
            if (pragasDoServico.length === 0) return null
            return (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-800">Pragas Alvo Automáticas</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque quais pragas devem ser selecionadas automaticamente ao gerar o certificado deste serviço.
                </p>
                <div className="flex flex-wrap gap-2">
                  {pragasDoServico.map(praga => {
                    const marcada = editingPragasAuto.includes(praga)
                    return (
                      <button
                        key={praga}
                        type="button"
                        onClick={() => toggleEditingPraga(praga)}
                        className={`
                          px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer
                          ${marcada
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'bg-white border-amber-300 text-amber-700 hover:border-amber-400 hover:bg-amber-50'
                          }
                        `}
                      >
                        {marcada && <span className="mr-1">✓</span>}
                        {praga}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Dedetização */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Dedetização</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['dedetizacao.lambdacialotrina', 'Lambdacialotrina'], ['dedetizacao.alfaCipermetrina', 'Alfa-Cipermetrina'], ['dedetizacao.piretroide', 'Piretróide']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Diluição */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Diluição</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['diluicao1.diluicao30_45', '30-45ml/10litros'], ['diluicao1.diluicao50_100', '50-100ml/10litros'], ['diluicao1.diluicao100_200', '100-200ml/10litros']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Descupinização */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Descupinização</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['descupinizacao.fipronil', 'Fipronil'], ['descupinizacao.imidacloprido', 'Imidacloprido'], ['descupinizacao.bifentrina', 'Bifentrina']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Diluição Alt */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Diluição (Alternativa)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['diluicao2.diluicao25_50', '25-50ml/10litros'], ['diluicao2.diluicao50_100_2', '50-100ml/10litros']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Desratização */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Desratização</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['desratizacao.flocoumafen', 'Flocoumafen'], ['desratizacao.cumatetrail', 'Cumatetrail'], ['desratizacao.brodifacoum', 'Brodifacoum']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Iscagem */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Iscagem</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[['iscagem.iscagem50_100', '50-100g/10m²'], ['iscagem.iscagem100_200', '100-200g/10m²'], ['iscagem.iscagem200_300', '200-300g/10m²']].map(([path, label]) => (
                  <div key={path} className="flex items-center space-x-2">
                    <Checkbox id={`auto-${path}`} checked={(editingData as any)[path.split('.')[0]][path.split('.')[1]]} onCheckedChange={(v) => handleEditingCheckbox(path, v as boolean)} />
                    <Label htmlFor={`auto-${path}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingServico(null)}>Voltar</Button>
            <Button onClick={saveAutomation} disabled={savingAutomation} className="gap-2">
              {savingAutomation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </form>
  )
}