'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toLocalDateInput, formatDateBRFromYYYYMMDD } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface BaixaParcelaDialogProps {
  parcela: {
    id: string
    numero_parcela: number
    valor_parcela: number
    data_vencimento: string
    status: string
  }
  onUpdate: () => void
}

export function BaixaParcelaDialog({ parcela, onUpdate }: BaixaParcelaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: 'paga',
    data_pagamento: toLocalDateInput(),
    valor_pago: parcela.valor_parcela.toString(),
    forma_pagamento: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/parcelas/${parcela.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valor_pago: parseFloat(formData.valor_pago),
        }),
      })

      if (response.ok) {
        toast.success('Parcela atualizada com sucesso!')
        setOpen(false)
        onUpdate()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar parcela')
      }
    } catch (error) {
      toast.error('Erro ao atualizar parcela')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formasPagamento = [
    'Dinheiro',
    'Pix',
    'Transferência Bancária',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Boleto',
    'Outro',
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={parcela.status === 'paga'}>
          {parcela.status === 'paga' ? 'Paga' : 'Registrar Pagamento'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Baixa de Parcela
          </DialogTitle>
          <DialogDescription>
            Parcela {parcela.numero_parcela} - {formatCurrency(parcela.valor_parcela)}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
                disabled={loading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_pagamento" className="text-right">
                Data Pagamento
              </Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => handleChange('data_pagamento', e.target.value)}
                className="col-span-3"
                disabled={loading || formData.status !== 'paga'}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor_pago" className="text-right">
                Valor Pago
              </Label>
              <Input
                id="valor_pago"
                type="number"
                step="0.01"
                value={formData.valor_pago}
                onChange={(e) => handleChange('valor_pago', e.target.value)}
                className="col-span-3"
                disabled={loading || formData.status !== 'paga'}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forma_pagamento" className="text-right">
                Forma Pagamento
              </Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) => handleChange('forma_pagamento', value)}
                disabled={loading || formData.status !== 'paga'}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <p className="font-medium">Resumo da Parcela</p>
              <p className="text-muted-foreground">
                Vencimento: {formatDateBRFromYYYYMMDD(parcela.data_vencimento)}
              </p>
            </div>
            <div className="text-right">
              <Badge 
                variant={parcela.status === 'paga' ? 'default' : 'secondary'}
                className="mb-2"
              >
                {parcela.status === 'paga' ? 'Paga' : 'Pendente'}
              </Badge>
              <p className="font-medium">
                {formatCurrency(parcela.valor_parcela)}
              </p>
            </div>
          </div>
        </form>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Confirmar Baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
