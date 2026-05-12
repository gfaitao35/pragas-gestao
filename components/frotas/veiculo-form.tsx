'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVeiculoAction, updateVeiculoAction } from '@/app/dashboard/frotas/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Veiculo, TipoCombustivel } from '@/lib/types'

interface VeiculoFormProps {
  veiculo?: Veiculo
  onSuccess?: () => void
}

const tiposCombustivel: { value: TipoCombustivel; label: string }[] = [
  { value: 'flex', label: 'Flex (Gasolina/Etanol)' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gnv', label: 'GNV' },
  { value: 'eletrico', label: 'Elétrico' },
]

export function VeiculoForm({ veiculo, onSuccess }: VeiculoFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    modelo: veiculo?.modelo || '',
    marca: veiculo?.marca || '',
    placa: veiculo?.placa || '',
    ano: veiculo?.ano?.toString() || '',
    cor: veiculo?.cor || '',
    quilometragem: veiculo?.quilometragem?.toString() || '0',
    tipo_combustivel: veiculo?.tipo_combustivel || '',
    observacoes: veiculo?.observacoes || '',
    ativo: veiculo?.ativo ?? true,
  })

  const router = useRouter()

  const formatPlaca = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
    if (cleaned.length <= 3) return cleaned
    // Formato Mercosul: ABC1D23 ou formato antigo: ABC-1234
    if (cleaned.length === 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned)) {
      return cleaned // Mercosul
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const data = {
      modelo: formData.modelo,
      marca: formData.marca || null,
      placa: formData.placa.replace('-', '').toUpperCase(),
      ano: formData.ano ? parseInt(formData.ano) : null,
      cor: formData.cor || null,
      quilometragem: parseInt(formData.quilometragem) || 0,
      tipo_combustivel: (formData.tipo_combustivel as TipoCombustivel) || null,
      observacoes: formData.observacoes || null,
      ativo: formData.ativo,
    }

    if (veiculo) {
      const result = await updateVeiculoAction(veiculo.id, data)
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success('Veículo atualizado com sucesso')
    } else {
      const result = await createVeiculoAction(data)
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success('Veículo cadastrado com sucesso')
    }

    setLoading(false)
    router.refresh()
    onSuccess?.()
  }

  const currentYear = new Date().getFullYear()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          <Input
            id="marca"
            value={formData.marca}
            onChange={(e) => handleChange('marca', e.target.value)}
            placeholder="Ex: Fiat, Volkswagen, Toyota..."
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo *</Label>
          <Input
            id="modelo"
            value={formData.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
            placeholder="Ex: Uno, Gol, Corolla..."
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="placa">Placa *</Label>
          <Input
            id="placa"
            value={formatPlaca(formData.placa)}
            onChange={(e) => handleChange('placa', e.target.value)}
            placeholder="ABC-1234 ou ABC1D23"
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ano">Ano</Label>
          <Input
            id="ano"
            type="number"
            value={formData.ano}
            onChange={(e) => handleChange('ano', e.target.value)}
            min={1900}
            max={currentYear + 1}
            placeholder={currentYear.toString()}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cor">Cor</Label>
          <Input
            id="cor"
            value={formData.cor}
            onChange={(e) => handleChange('cor', e.target.value)}
            placeholder="Ex: Branco, Prata, Preto..."
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo_combustivel">Tipo de Combustível</Label>
          <Select
            value={formData.tipo_combustivel}
            onValueChange={(value) => handleChange('tipo_combustivel', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {tiposCombustivel.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quilometragem">Quilometragem Atual</Label>
          <Input
            id="quilometragem"
            type="number"
            value={formData.quilometragem}
            onChange={(e) => handleChange('quilometragem', e.target.value)}
            min={0}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={3}
          placeholder="Informações adicionais sobre o veículo..."
          disabled={loading}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="ativo"
          checked={formData.ativo}
          onCheckedChange={(checked) => handleChange('ativo', checked)}
          disabled={loading}
        />
        <Label htmlFor="ativo">Veículo ativo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {veiculo ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  )
}
