'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAbastecimentoAction, deleteAbastecimentoAction } from '@/app/dashboard/frotas/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Fuel, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Abastecimento, TipoCombustivel } from '@/lib/types'

interface AbastecimentosSectionProps {
  veiculoId: string
  abastecimentos: Abastecimento[]
  tipoCombustivel: TipoCombustivel | null
}

const tiposCombustivel: { value: TipoCombustivel; label: string }[] = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gnv', label: 'GNV' },
]

const combustivelLabels: Record<string, string> = {
  'flex': 'Flex',
  'gasolina': 'Gasolina',
  'etanol': 'Etanol',
  'diesel': 'Diesel',
  'gnv': 'GNV',
  'eletrico': 'Elétrico',
}

export function AbastecimentosSection({ veiculoId, abastecimentos, tipoCombustivel }: AbastecimentosSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingAbastecimento, setDeletingAbastecimento] = useState<Abastecimento | null>(null)
  const [formData, setFormData] = useState({
    data_abastecimento: new Date().toISOString().split('T')[0],
    quilometragem: '',
    litros: '',
    valor_litro: '',
    valor_total: '',
    tipo_combustivel: tipoCombustivel && tipoCombustivel !== 'flex' && tipoCombustivel !== 'eletrico' 
      ? tipoCombustivel 
      : '' as TipoCombustivel | '',
    posto: '',
    observacoes: '',
  })
  const router = useRouter()

  // Calcular valor total automaticamente
  useEffect(() => {
    const litros = parseFloat(formData.litros) || 0
    const valorLitro = parseFloat(formData.valor_litro) || 0
    const valorTotal = litros * valorLitro
    if (valorTotal > 0) {
      setFormData(prev => ({ ...prev, valor_total: valorTotal.toFixed(2) }))
    }
  }, [formData.litros, formData.valor_litro])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      data_abastecimento: new Date().toISOString().split('T')[0],
      quilometragem: '',
      litros: '',
      valor_litro: '',
      valor_total: '',
      tipo_combustivel: tipoCombustivel && tipoCombustivel !== 'flex' && tipoCombustivel !== 'eletrico' 
        ? tipoCombustivel 
        : '',
      posto: '',
      observacoes: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.litros || parseFloat(formData.litros) <= 0) {
      toast.error('Informe a quantidade de litros')
      return
    }

    if (!formData.valor_litro || parseFloat(formData.valor_litro) <= 0) {
      toast.error('Informe o valor por litro')
      return
    }

    setLoading(true)

    const result = await createAbastecimentoAction({
      veiculo_id: veiculoId,
      data_abastecimento: formData.data_abastecimento,
      quilometragem: formData.quilometragem ? parseInt(formData.quilometragem) : null,
      litros: parseFloat(formData.litros),
      valor_litro: parseFloat(formData.valor_litro),
      valor_total: parseFloat(formData.valor_total),
      tipo_combustivel: (formData.tipo_combustivel as TipoCombustivel) || null,
      posto: formData.posto || null,
      observacoes: formData.observacoes || null,
    })

    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success('Abastecimento registrado com sucesso! Despesa criada no financeiro.')
    resetForm()
    setDialogOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingAbastecimento) return
    
    const result = await deleteAbastecimentoAction(deletingAbastecimento.id, veiculoId)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    
    toast.success('Abastecimento excluído com sucesso')
    setDeletingAbastecimento(null)
    router.refresh()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatKm = (km: number | null) => {
    if (!km) return '-'
    return new Intl.NumberFormat('pt-BR').format(km) + ' km'
  }

  const formatLitros = (litros: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(litros) + ' L'
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Abastecimentos</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Abastecimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Abastecimento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.data_abastecimento}
                      onChange={(e) => handleChange('data_abastecimento', e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Combustível</Label>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Litros *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.litros}
                      onChange={(e) => handleChange('litros', e.target.value)}
                      placeholder="0,00"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor/Litro *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.valor_litro}
                      onChange={(e) => handleChange('valor_litro', e.target.value)}
                      placeholder="0,000"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_total}
                      onChange={(e) => handleChange('valor_total', e.target.value)}
                      placeholder="0,00"
                      disabled={loading}
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quilometragem</Label>
                    <Input
                      type="number"
                      value={formData.quilometragem}
                      onChange={(e) => handleChange('quilometragem', e.target.value)}
                      placeholder="Km atual"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posto</Label>
                    <Input
                      value={formData.posto}
                      onChange={(e) => handleChange('posto', e.target.value)}
                      placeholder="Nome do posto"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => handleChange('observacoes', e.target.value)}
                    rows={2}
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {abastecimentos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead className="text-right">Litros</TableHead>
                    <TableHead className="text-right">R$/L</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Quilometragem</TableHead>
                    <TableHead>Posto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abastecimentos.map((abastecimento) => (
                    <TableRow key={abastecimento.id}>
                      <TableCell>{formatDate(abastecimento.data_abastecimento)}</TableCell>
                      <TableCell>
                        {abastecimento.tipo_combustivel ? (
                          <Badge variant="outline">
                            {combustivelLabels[abastecimento.tipo_combustivel] || abastecimento.tipo_combustivel}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatLitros(abastecimento.litros)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(abastecimento.valor_litro)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(abastecimento.valor_total)}</TableCell>
                      <TableCell className="font-mono">{formatKm(abastecimento.quilometragem)}</TableCell>
                      <TableCell>{abastecimento.posto || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAbastecimento(abastecimento)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Fuel className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum abastecimento</h3>
              <p className="text-sm text-muted-foreground">
                Registre abastecimentos para controlar os custos com combustível
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingAbastecimento} onOpenChange={() => setDeletingAbastecimento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este abastecimento? A despesa vinculada no financeiro também será excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
