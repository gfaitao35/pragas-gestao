'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrdemAction, updateOrdemAction } from '@/app/dashboard/ordens/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { OrdemServico, Cliente, StatusOrdemServico, Servico } from '@/lib/types'
import { toLocalDateInput } from '@/lib/utils'

interface OrdemFormProps {
  ordem?: OrdemServico
  clientes: Pick<Cliente, 'id' | 'razao_social' | 'nome_fantasia'>[]
  onSuccess?: () => void
}

interface ServicoSelecionado {
  nome: string
  descricao: string
  id?: string
}

const tiposServicoDefault = [
  'Dedetização',
  'Desratização',
  'Descupinização',
  'Sanitização',
  'Controle de Pragas',
  'Limpeza de Caixa D\'água',
  'Outro',
]

export function OrdemForm({ ordem, clientes, onSuccess }: OrdemFormProps) {
  const [loading, setLoading] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loadingServicos, setLoadingServicos] = useState(true)
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([])
  const [numParcelas, setNumParcelas] = useState(1)
  const today = new Date()
  const [diaVencimento, setDiaVencimento] = useState(String(today.getDate()).padStart(2, '0'))

  const [formData, setFormData] = useState({
    cliente_id: ordem?.cliente_id || '',
    data_execucao: ordem?.data_execucao || toLocalDateInput(),
    local_execucao: ordem?.local_execucao || '',
    equipamentos_utilizados: ordem?.equipamentos_utilizados || '',
    produtos_aplicados: ordem?.produtos_aplicados || '',
    area_tratada: ordem?.area_tratada || '',
    pragas_alvo: ordem?.pragas_alvo || '',
    tecnico_responsavel: ordem?.tecnico_responsavel || '',
    status: (ordem?.status || 'pendente') as StatusOrdemServico,
    valor: ordem?.valor?.toString() || '',
    garantia_meses: ordem?.garantia_meses?.toString() || '',
    visitas_gratuitas: ordem?.visitas_gratuitas?.toString() || '0',
    observacoes: ordem?.observacoes || '',
    descricao_adicional: (() => {
      // descricao_servico é o texto estruturado "Serviço: descrição\n\nServiço2: desc"
      // Extraímos apenas linhas que NÃO sejam nomes de serviços automáticos — já que
      // o campo livre do usuário fica misturado. Deixamos em branco para edição limpa.
      return ''
    })(),
  })

  const router = useRouter()

  // Carregar serviços da API
  useEffect(() => {
    const loadServicos = async () => {
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

    loadServicos()
  }, [])

  // Carregar serviços da OS ao editar
  useEffect(() => {
    if (ordem?.tipo_servico) {
      // Parse tipo_servico que é uma string com múltiplos serviços separados por ','
      const servicosNomes = ordem.tipo_servico.split(',').map(s => s.trim())
      
      // Parse descricao_servico que contém as descrições
      const descricoes = ordem.descricao_servico?.split('\n\n') || []
      
      const servicosParsed: ServicoSelecionado[] = servicosNomes.map((nome, index) => {
        const descricao = descricoes
          .find(d => d.startsWith(nome))
          ?.replace(`${nome}: `, '')
          .trim() || ''
        
        return {
          nome,
          descricao,
        }
      })
      
      setServicosSelecionados(servicosParsed)
    }
  }, [ordem])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAdicionarServico = (nomeServico: string) => {
    const servico = servicos.find(s => s.nome === nomeServico)
    if (!servico) return

    const novoServico: ServicoSelecionado = {
      nome: nomeServico,
      descricao: servico.descricao || '',
      id: servico.id,
    }

    setServicosSelecionados([...servicosSelecionados, novoServico])
  }

  const handleRemoverServico = (index: number) => {
    setServicosSelecionados(servicosSelecionados.filter((_, i) => i !== index))
  }

  const handleEditarServico = (index: number, novaDescricao: string) => {
    const novosSelecionados = [...servicosSelecionados]
    novosSelecionados[index].descricao = novaDescricao
    setServicosSelecionados(novosSelecionados)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (servicosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um serviço')
      return
    }

    setLoading(true)

    // Compilar tipo_servico e descrição dos serviços (texto estruturado automático)
    const tipoServico = servicosSelecionados.map(s => s.nome).join(', ')
    const descricaoServicos = servicosSelecionados
      .filter(s => s.descricao)
      .map(s => `${s.nome}: ${s.descricao}`)
      .join('\n\n')

    // Descrição adicional livre do usuário vai para observacoes
    const observacoesFinal = [
      formData.observacoes,
      formData.descricao_adicional,
    ].filter(Boolean).join('\n\n') || null

    const data = {
      cliente_id: formData.cliente_id,
      data_execucao: formData.data_execucao,
      tipo_servico: tipoServico,
      descricao_servico: descricaoServicos || null,
      local_execucao: formData.local_execucao || null,
      equipamentos_utilizados: formData.equipamentos_utilizados || null,
      produtos_aplicados: formData.produtos_aplicados || null,
      area_tratada: formData.area_tratada || null,
      pragas_alvo: formData.pragas_alvo || null,
      tecnico_responsavel: formData.tecnico_responsavel || null,
      status: formData.status,
      valor: formData.valor ? parseFloat(formData.valor) : null,
      garantia_meses: formData.garantia_meses ? parseInt(formData.garantia_meses) : null,
      visitas_gratuitas: formData.visitas_gratuitas ? parseInt(formData.visitas_gratuitas) : 0,
      observacoes: observacoesFinal,
    }

    if (ordem) {
      const result = await updateOrdemAction(ordem.id, data)
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success('Ordem de serviço atualizada com sucesso')
    } else {
      const result = await createOrdemAction({
        ...data,
        num_parcelas: numParcelas,
        dia_vencimento: parseInt(diaVencimento),
      })
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success(numParcelas > 1 ? `OS criada com ${numParcelas} parcelas!` : 'Ordem de serviço criada com sucesso')
    }

    setLoading(false)
    router.refresh()
    onSuccess?.()
  }

  const tiposServico = servicos.length > 0 
    ? servicos.map(s => s.nome)
    : tiposServicoDefault

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Cliente *</Label>
          <Select
            value={formData.cliente_id}
            onValueChange={(value) => handleChange('cliente_id', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.razao_social}
                  {cliente.nome_fantasia && ` (${cliente.nome_fantasia})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_execucao">Data de Execução *</Label>
          <Input
            id="data_execucao"
            type="date"
            value={formData.data_execucao}
            onChange={(e) => handleChange('data_execucao', e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* SERVIÇOS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Serviços Selecionados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Adicionar Novo Serviço */}
          <div className="space-y-2">
            <Label htmlFor="tipo_servico">Adicionar Tipo de Serviço</Label>
            <Select
              onValueChange={(value) => {
                handleAdicionarServico(value)
              }}
              disabled={loading || loadingServicos}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {loadingServicos ? (
                  <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
                ) : (
                  tiposServico.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Serviços Adicionados */}
          {servicosSelecionados.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium">Serviços Adicionados:</Label>
              {servicosSelecionados.map((servico, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm">{servico.nome}</p>
                    <Textarea
                      value={servico.descricao}
                      onChange={(e) => handleEditarServico(index, e.target.value)}
                      placeholder="Descrição do serviço..."
                      rows={2}
                      className="text-xs"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverServico(index)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STATUS */}
      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleChange('status', value)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao_adicional">Descrição Adicional</Label>
        <Textarea
          id="descricao_adicional"
          value={formData.descricao_adicional}
          onChange={(e) => handleChange('descricao_adicional', e.target.value)}
          rows={2}
          placeholder="Adicione detalhes extras (opcional)"
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="local_execucao">Local de Execução</Label>
          <Input
            id="local_execucao"
            value={formData.local_execucao}
            onChange={(e) => handleChange('local_execucao', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area_tratada">Área Tratada</Label>
          <Input
            id="area_tratada"
            value={formData.area_tratada}
            onChange={(e) => handleChange('area_tratada', e.target.value)}
            placeholder="Ex: 500m²"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pragas_alvo">Pragas Alvo</Label>
          <Input
            id="pragas_alvo"
            value={formData.pragas_alvo}
            onChange={(e) => handleChange('pragas_alvo', e.target.value)}
            placeholder="Ex: Baratas, Ratos, Cupins"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tecnico_responsavel">Técnico Responsável</Label>
          <Input
            id="tecnico_responsavel"
            value={formData.tecnico_responsavel}
            onChange={(e) => handleChange('tecnico_responsavel', e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="produtos_aplicados">Produtos Aplicados</Label>
        <Textarea
          id="produtos_aplicados"
          value={formData.produtos_aplicados}
          onChange={(e) => handleChange('produtos_aplicados', e.target.value)}
          rows={2}
          placeholder="Liste os produtos utilizados no serviço"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="equipamentos_utilizados">Equipamentos Utilizados</Label>
        <Textarea
          id="equipamentos_utilizados"
          value={formData.equipamentos_utilizados}
          onChange={(e) => handleChange('equipamentos_utilizados', e.target.value)}
          rows={2}
          placeholder="Liste os equipamentos utilizados"
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor}
            onChange={(e) => handleChange('valor', e.target.value)}
            placeholder="0,00"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="garantia_meses">Garantia (meses)</Label>
          <Input
            id="garantia_meses"
            type="number"
            min="0"
            value={formData.garantia_meses}
            onChange={(e) => handleChange('garantia_meses', e.target.value)}
            placeholder="Ex: 6"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitas_gratuitas">Visitas Gratuitas</Label>
          <Input
            id="visitas_gratuitas"
            type="number"
            min="0"
            value={formData.visitas_gratuitas}
            onChange={(e) => handleChange('visitas_gratuitas', e.target.value)}
            placeholder="Ex: 2"
            disabled={loading}
          />
        </div>
      </div>

      {/* PARCELAMENTO */}
      {!ordem && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parcelamento do Pagamento (opcional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Número de Parcelas</Label>
              <Select value={String(numParcelas)} onValueChange={v => setNumParcelas(parseInt(v))} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">À vista (1x)</SelectItem>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Dia do Vencimento</Label>
              <Select value={diaVencimento} onValueChange={setDiaVencimento} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                    <SelectItem key={d} value={d}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {numParcelas > 1 && formData.valor && (
            <p className="text-xs text-muted-foreground bg-background rounded p-2 border">
              💡 Serão criados <strong>{numParcelas} lançamentos</strong> de <strong>R$ {(parseFloat(formData.valor) / numParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> cada, vencendo todo dia <strong>{diaVencimento}</strong> por {numParcelas} meses a partir da data de execução.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={2}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading || !formData.cliente_id || servicosSelecionados.length === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {ordem ? 'Atualizar' : 'Criar Ordem'}
        </Button>
      </div>
    </form>
  )
}