'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createManutencaoAction, deleteManutencaoAction } from '@/app/dashboard/frotas/actions'
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
import { Plus, Wrench, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Manutencao, TipoManutencao } from '@/lib/types'

interface ManutencoesSectionProps {
  veiculoId: string
  manutencoes: Manutencao[]
}

const tiposManutencao: { value: TipoManutencao; label: string }[] = [
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'troca_oleo', label: 'Troca de Óleo' },
  { value: 'pneus', label: 'Pneus' },
  { value: 'freios', label: 'Freios' },
  { value: 'outros', label: 'Outros' },
]

const tipoManutencaoLabels: Record<string, string> = {
  'preventiva': 'Preventiva',
  'corretiva': 'Corretiva',
  'revisao': 'Revisão',
  'troca_oleo': 'Troca de Óleo',
  'pneus': 'Pneus',
  'freios': 'Freios',
  'outros': 'Outros',
}

const tipoManutencaoColors: Record<string, string> = {
  'preventiva': 'bg-green-500/10 text-green-600',
  'corretiva': 'bg-red-500/10 text-red-600',
  'revisao': 'bg-blue-500/10 text-blue-600',
  'troca_oleo': 'bg-yellow-500/10 text-yellow-600',
  'pneus': 'bg-gray-500/10 text-gray-600',
  'freios': 'bg-orange-500/10 text-orange-600',
  'outros': 'bg-purple-500/10 text-purple-600',
}

export function ManutencoesSection({ veiculoId, manutencoes }: ManutencoesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingManutencao, setDeletingManutencao] = useState<Manutencao | null>(null)
  const [formData, setFormData] = useState({
    tipo_manutencao: '' as TipoManutencao | '',
    descricao: '',
    data_manutencao: new Date().toISOString().split('T')[0],
    quilometragem: '',
    valor: '',
    fornecedor: '',
    observacoes: '',
  })
  const router = useRouter()

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      tipo_manutencao: '',
      descricao: '',
      data_manutencao: new Date().toISOString().split('T')[0],
      quilometragem: '',
      valor: '',
      fornecedor: '',
      observacoes: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tipo_manutencao) {
      toast.error('Selecione o tipo de manutenção')
      return
    }

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Informe o valor da manutenção')
      return
    }

    setLoading(true)

    const result = await createManutencaoAction({
      veiculo_id: veiculoId,
      tipo_manutencao: formData.tipo_manutencao as TipoManutencao,
      descricao: formData.descricao || null,
      data_manutencao: formData.data_manutencao,
      quilometragem: formData.quilometragem ? parseInt(formData.quilometragem) : null,
      valor: parseFloat(formData.valor),
      fornecedor: formData.fornecedor || null,
      observacoes: formData.observacoes || null,
    })

    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success('Manutenção registrada com sucesso! Despesa criada no financeiro.')
    resetForm()
    setDialogOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingManutencao) return
    
    const result = await deleteManutencaoAction(deletingManutencao.id, veiculoId)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    
    toast.success('Manutenção excluída com sucesso')
    setDeletingManutencao(null)
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Manutenções</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Manutenção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Manutenção</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de Manutenção *</Label>
                    <Select
                      value={formData.tipo_manutencao}
                      onValueChange={(value) => handleChange('tipo_manutencao', value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposManutencao.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.data_manutencao}
                      onChange={(e) => handleChange('data_manutencao', e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => handleChange('descricao', e.target.value)}
                    placeholder="Ex: Troca de pastilhas de freio dianteiras"
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => handleChange('valor', e.target.value)}
                      placeholder="0,00"
                      required
                      disabled={loading}
                    />
                  </div>
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
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor/Oficina</Label>
                  <Input
                    value={formData.fornecedor}
                    onChange={(e) => handleChange('fornecedor', e.target.value)}
                    placeholder="Nome da oficina ou mecânico"
                    disabled={loading}
                  />
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
          {manutencoes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Quilometragem</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoes.map((manutencao) => (
                    <TableRow key={manutencao.id}>
                      <TableCell>{formatDate(manutencao.data_manutencao)}</TableCell>
                      <TableCell>
                        <Badge className={tipoManutencaoColors[manutencao.tipo_manutencao]}>
                          {tipoManutencaoLabels[manutencao.tipo_manutencao] || manutencao.tipo_manutencao}
                        </Badge>
                      </TableCell>
                      <TableCell>{manutencao.descricao || '-'}</TableCell>
                      <TableCell className="font-mono">{formatKm(manutencao.quilometragem)}</TableCell>
                      <TableCell>{manutencao.fornecedor || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(manutencao.valor)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingManutencao(manutencao)}
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
              <Wrench className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhuma manutenção</h3>
              <p className="text-sm text-muted-foreground">
                Registre manutenções para controlar os custos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingManutencao} onOpenChange={() => setDeletingManutencao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta manutenção? A despesa vinculada no financeiro também será excluída.
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
