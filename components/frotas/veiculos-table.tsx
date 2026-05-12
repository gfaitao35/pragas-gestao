'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteVeiculoAction } from '@/app/dashboard/frotas/actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VeiculoForm } from './veiculo-form'
import { MoreHorizontal, Pencil, Trash2, Search, Car, Eye, Fuel, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import type { Veiculo } from '@/lib/types'

interface VeiculoComStats extends Veiculo {
  total_manutencoes: number
  total_abastecimentos: number
  custo_total: number
}

interface VeiculosTableProps {
  veiculos: VeiculoComStats[]
}

const combustivelLabels: Record<string, string> = {
  'flex': 'Flex',
  'gasolina': 'Gasolina',
  'etanol': 'Etanol',
  'diesel': 'Diesel',
  'gnv': 'GNV',
  'eletrico': 'Elétrico',
}

export function VeiculosTable({ veiculos }: VeiculosTableProps) {
  const [search, setSearch] = useState('')
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null)
  const [deletingVeiculo, setDeletingVeiculo] = useState<Veiculo | null>(null)
  const router = useRouter()

  const filteredVeiculos = veiculos.filter(
    (veiculo) =>
      veiculo.modelo.toLowerCase().includes(search.toLowerCase()) ||
      veiculo.marca?.toLowerCase().includes(search.toLowerCase()) ||
      veiculo.placa.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deletingVeiculo) return
    const result = await deleteVeiculoAction(deletingVeiculo.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Veículo excluído com sucesso')
    setDeletingVeiculo(null)
    router.refresh()
  }

  const formatPlaca = (placa: string) => {
    if (!placa) return ''
    const clean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (clean.length === 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean)) {
      return clean // Mercosul
    }
    if (clean.length >= 4) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`
    }
    return clean
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatKm = (km: number) => {
    return new Intl.NumberFormat('pt-BR').format(km) + ' km'
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por modelo, marca ou placa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredVeiculos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead className="text-right">Quilometragem</TableHead>
                    <TableHead className="text-center">Manutenções</TableHead>
                    <TableHead className="text-center">Abastecimentos</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVeiculos.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{veiculo.modelo}</p>
                          {veiculo.marca && (
                            <p className="text-sm text-muted-foreground">{veiculo.marca}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{formatPlaca(veiculo.placa)}</TableCell>
                      <TableCell>{veiculo.ano || '-'}</TableCell>
                      <TableCell>
                        {veiculo.tipo_combustivel ? (
                          <Badge variant="outline">
                            {combustivelLabels[veiculo.tipo_combustivel] || veiculo.tipo_combustivel}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKm(veiculo.quilometragem)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Wrench className="h-3 w-3 text-muted-foreground" />
                          {veiculo.total_manutencoes}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Fuel className="h-3 w-3 text-muted-foreground" />
                          {veiculo.total_abastecimentos}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(veiculo.custo_total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={veiculo.ativo ? 'default' : 'secondary'}>
                          {veiculo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/frotas/${veiculo.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingVeiculo(veiculo)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingVeiculo(veiculo)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Car className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum veículo encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente buscar por outro termo'
                  : 'Comece cadastrando seu primeiro veículo'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingVeiculo} onOpenChange={() => setEditingVeiculo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          {editingVeiculo && (
            <VeiculoForm veiculo={editingVeiculo} onSuccess={() => setEditingVeiculo(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingVeiculo} onOpenChange={() => setDeletingVeiculo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo{' '}
              <strong>{deletingVeiculo?.modelo} ({formatPlaca(deletingVeiculo?.placa || '')})</strong>? 
              Todas as manutenções, abastecimentos e documentos vinculados também serão excluídos. 
              Esta ação não pode ser desfeita.
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
