'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NovoContratoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cliente_id: '',
    data_inicio: '',
    data_fim: '',
    valor_total: '',
    numero_parcelas: '',
    dia_vencimento: '',
    observacoes: ''
  })

  const [clientes, setClientes] = useState<any[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)

  React.useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoadingClientes(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const valor_total = parseFloat(formData.valor_total)
      const numero_parcelas = parseInt(formData.numero_parcelas)
      const valor_parcela = valor_total / numero_parcelas

      const response = await fetch('/api/contratos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valor_total,
          numero_parcelas,
          valor_parcela,
          dia_vencimento: parseInt(formData.dia_vencimento)
        }),
      })

      if (response.ok) {
        router.push('/dashboard/contratos')
      } else {
        throw new Error('Erro ao criar contrato')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contratos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Contrato</h1>
          <p className="text-muted-foreground">Crie um novo contrato de serviço</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Contrato</CardTitle>
          <CardDescription>Preencha as informações do contrato</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente</Label>
                <Select value={formData.cliente_id} onValueChange={(value) => handleInputChange('cliente_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClientes ? (
                      <SelectItem value="loading">Carregando...</SelectItem>
                    ) : (
                      clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.razao_social}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_total">Valor Total (R$)</Label>
                <Input
                  id="valor_total"
                  type="number"
                  step="0.01"
                  value={formData.valor_total}
                  onChange={(e) => handleInputChange('valor_total', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => handleInputChange('data_fim', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_parcelas">Número de Parcelas</Label>
                <Input
                  id="numero_parcelas"
                  type="number"
                  min="1"
                  value={formData.numero_parcelas}
                  onChange={(e) => handleInputChange('numero_parcelas', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dia_vencimento">Dia de Vencimento</Label>
                <Input
                  id="dia_vencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dia_vencimento}
                  onChange={(e) => handleInputChange('dia_vencimento', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/contratos">
                <Button variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Salvando...' : 'Salvar Contrato'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
