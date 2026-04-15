'use client'

import React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClienteAction, updateClienteAction } from '@/app/dashboard/clientes/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente, TipoPessoa } from '@/lib/types'

interface ClienteFormProps {
  cliente?: Cliente
  onSuccess?: () => void
}

export function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const [loading, setLoading] = useState(false)
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(cliente?.tipo_pessoa || 'juridica')
  const [formData, setFormData] = useState({
    razao_social: cliente?.razao_social || '',
    nome_fantasia: cliente?.nome_fantasia || '',
    cnpj: cliente?.cnpj || '',
    cpf: cliente?.cpf || '',
    endereco: cliente?.endereco || '',
    cidade: cliente?.cidade || '',
    estado: cliente?.estado || '',
    cep: cliente?.cep || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    contato_responsavel: cliente?.contato_responsavel || '',
    observacoes: cliente?.observacoes || '',
    ativo: cliente?.ativo ?? true,
  })

  const router = useRouter()

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 14)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
    if (numbers.length <= 12)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`
  }

  const formatTelefone = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : ''
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTipoPessoaChange = (value: TipoPessoa) => {
    setTipoPessoa(value)
    if (value === 'fisica') {
      setFormData((prev) => ({ ...prev, cnpj: '', cpf: prev.cpf || '' }))
    } else {
      setFormData((prev) => ({ ...prev, cpf: '', cnpj: prev.cnpj || '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const data = {
      ...formData,
      tipo_pessoa: tipoPessoa,
      cnpj: tipoPessoa === 'juridica' ? formData.cnpj.replace(/\D/g, '') : '',
      cpf: tipoPessoa === 'fisica' ? formData.cpf.replace(/\D/g, '') : '',
      telefone: formData.telefone.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, ''),
      user_id: cliente?.user_id ?? '',
    }

    if (cliente) {
      const result = await updateClienteAction(cliente.id, data)
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success('Cliente atualizado com sucesso')
    } else {
      const result = await createClienteAction(data)
      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
        return
      }
      toast.success('Cliente cadastrado com sucesso')
    }

    setLoading(false)
    router.refresh()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Pessoa *</Label>
        <RadioGroup value={tipoPessoa} onValueChange={(v) => handleTipoPessoaChange(v as TipoPessoa)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="juridica" id="juridica" />
            <Label htmlFor="juridica" className="font-normal cursor-pointer">
              Pessoa Jurídica
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fisica" id="fisica" />
            <Label htmlFor="fisica" className="font-normal cursor-pointer">
              Pessoa Física
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="razao_social">
            {tipoPessoa === 'juridica' ? 'Razão Social *' : 'Nome Completo *'}
          </Label>
          <Input
            id="razao_social"
            value={formData.razao_social}
            onChange={(e) => handleChange('razao_social', e.target.value)}
            required
            disabled={loading}
          />
        </div>
        {tipoPessoa === 'juridica' && (
          <div className="space-y-2">
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              value={formData.nome_fantasia}
              onChange={(e) => handleChange('nome_fantasia', e.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tipoPessoa === 'juridica' ? (
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formatCNPJ(formData.cnpj)}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              required
              disabled={loading}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={formatCPF(formData.cpf)}
              onChange={(e) => handleChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formatTelefone(formData.telefone)}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input
          id="endereco"
          value={formData.endereco}
          onChange={(e) => handleChange('endereco', e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={formData.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado (UF)</Label>
          <Input
            id="estado"
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            placeholder="SP"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            value={formatCEP(formData.cep)}
            onChange={(e) => handleChange('cep', e.target.value)}
            placeholder="00000-000"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contato_responsavel">Contato Responsável</Label>
        <Input
          id="contato_responsavel"
          value={formData.contato_responsavel}
          onChange={(e) => handleChange('contato_responsavel', e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={3}
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
        <Label htmlFor="ativo">Cliente ativo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {cliente ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  )
}