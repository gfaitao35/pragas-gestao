'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOrdemAction } from '@/app/dashboard/ordens/actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrdemForm } from './ordem-form'
import { MoreHorizontal, Trash2, Search, ClipboardList, Award, Eye, Edit, Printer, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { generateOrderPDF } from '@/lib/pdf-os'
import { ActionMenu } from '@/components/ui/action-menu'
import type { OrdemServico, Cliente, StatusOrdemServico } from '@/lib/types'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'

interface OrdensTableProps {
  ordens: OrdemServico[]
  clientes: Pick<Cliente, 'id' | 'razao_social' | 'nome_fantasia'>[]
}

const statusConfig: Record<StatusOrdemServico, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer' },
  concluida:    { label: 'Concluída',    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer' },
  cancelada:    { label: 'Cancelada',    className: 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer' },
}

const statusOptions: { value: StatusOrdemServico; label: string }[] = [
  { value: 'pendente',     label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida',    label: 'Concluída' },
  { value: 'cancelada',    label: 'Cancelada' },
]

export function OrdensTable({ ordens: initialOrdens, clientes }: OrdensTableProps) {
  const router = useRouter()
  const [ordens, setOrdens] = useState<OrdemServico[]>(initialOrdens)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusOrdemServico | 'all'>('all')
  const [editingOrdem, setEditingOrdem] = useState<OrdemServico | null>(null)
  const [deletingOrdem, setDeletingOrdem] = useState<OrdemServico | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const filteredOrdens = ordens.filter((ordem) => {
    const matchesSearch =
      ordem.numero_os.toLowerCase().includes(search.toLowerCase()) ||
      (ordem.cliente as any)?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      ordem.tipo_servico.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ordem.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleStatusChange = async (ordemId: string, novoStatus: StatusOrdemServico) => {
    setUpdatingStatus(ordemId)
    try {
      const res = await fetch(`/api/ordens/${ordemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) {
        setOrdens(prev => prev.map(o => o.id === ordemId ? { ...o, status: novoStatus } : o))
        toast.success('Status atualizado!')
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handlePrintOS = async (ordem: OrdemServico) => {
    try {
      await generateOrderPDF(ordem)
      toast.success('OS enviada para impressão!')
    } catch {
      toast.error('Erro ao gerar PDF para impressão')
    }
  }

  const handleGenerateCertificate = (ordem: OrdemServico) => {
    router.push(`/dashboard/certificados/novo?ordem_id=${ordem.id}`)
  }

  const handleDelete = async () => {
    if (!deletingOrdem) return
    try {
      await deleteOrdemAction(deletingOrdem.id)
      toast.success('Ordem de serviço excluída com sucesso!')
      setDeletingOrdem(null)
      router.refresh()
    } catch {
      toast.error('Erro ao excluir ordem de serviço')
    }
  }

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente ou serviço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusOrdemServico | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdens.map((ordem) => {
                  const status = statusConfig[ordem.status]
                  const isUpdating = updatingStatus === ordem.id
                  return (
                    <TableRow key={ordem.id}>
                      <TableCell className="font-mono">{ordem.numero_os}</TableCell>
                      <TableCell>{(ordem.cliente as any)?.razao_social || '-'}</TableCell>
                      <TableCell>{ordem.tipo_servico}</TableCell>
                      <TableCell>{formatDateBRFromYYYYMMDD(ordem.data_execucao)}</TableCell>
                      <TableCell>{formatCurrency(ordem.valor)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={isUpdating}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 transition-colors ${status.className} ${isUpdating ? 'opacity-50' : ''}`}
                            >
                              {isUpdating ? '...' : status.label}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {statusOptions.map(opt => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => handleStatusChange(ordem.id, opt.value)}
                                className={ordem.status === opt.value ? 'font-bold' : ''}
                              >
                                {opt.label}
                                {ordem.status === opt.value && ' ✓'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: 'Visualizar',
                              icon: <Eye className="h-4 w-4" />,
                              onClick: () => router.push(`/dashboard/ordens/${ordem.id}`)
                            },
                            {
                              label: 'Editar',
                              icon: <Edit className="h-4 w-4" />,
                              onClick: () => setEditingOrdem(ordem)
                            },
                            {
                              label: 'Imprimir OS',
                              icon: <Printer className="h-4 w-4" />,
                              onClick: () => handlePrintOS(ordem)
                            },
                            ...(ordem.status === 'concluida'
                              ? [{
                                  label: 'Gerar Certificado',
                                  icon: <Award className="h-4 w-4" />,
                                  onClick: () => handleGenerateCertificate(ordem)
                                }]
                              : []),
                            {
                              label: 'Excluir',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => setDeletingOrdem(ordem),
                              variant: 'destructive' as const
                            }
                          ]}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </ActionMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredOrdens.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3>Nenhuma ordem encontrada</h3>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingOrdem} onOpenChange={() => setEditingOrdem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            {editingOrdem && (
              <OrdemForm ordem={editingOrdem} clientes={clientes} onSuccess={() => {
                setEditingOrdem(null)
                router.refresh()
              }} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingOrdem} onOpenChange={() => setDeletingOrdem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ordem "{deletingOrdem?.numero_os}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}