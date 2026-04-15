'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClienteAction } from '@/app/dashboard/clientes/actions'
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
import { ClienteForm } from './cliente-form'
import { MoreHorizontal, Pencil, Trash2, Search, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente } from '@/lib/types'
import Link from 'next/link'

interface ClientesTableProps {
  clientes: Cliente[]
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  const [search, setSearch] = useState('')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null)
  const router = useRouter()

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      cliente.cnpj?.includes(search) ||
      cliente.cpf?.includes(search) ||
      cliente.nome_fantasia?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deletingCliente) return
    const result = await deleteClienteAction(deletingCliente.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Cliente excluído com sucesso')
    setDeletingCliente(null)
    router.refresh()
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    const numbers = cnpj.replace(/\D/g, '')
    if (numbers.length === 14) {
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    }
    return cnpj
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return ''
    const numbers = cpf.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    }
    return cpf
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, nome fantasia, CPF ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredClientes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Razão Social / Nome</TableHead>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {cliente.tipo_pessoa === 'fisica' ? 'PF' : 'PJ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                      <TableCell>{cliente.nome_fantasia || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {cliente.tipo_pessoa === 'fisica'
                          ? formatCPF(cliente.cpf || '')
                          : formatCNPJ(cliente.cnpj || '')}
                      </TableCell>
                      <TableCell>
                        {cliente.cidade && cliente.estado
                          ? `${cliente.cidade}/${cliente.estado}`
                          : '-'}
                      </TableCell>
                      <TableCell>{cliente.telefone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.ativo ? 'default' : 'secondary'}>
                          {cliente.ativo ? 'Ativo' : 'Inativo'}
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
                              <Link href={`/dashboard/clientes/${cliente.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingCliente(cliente)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingCliente(cliente)}
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
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente buscar por outro termo'
                  : 'Comece cadastrando seu primeiro cliente'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingCliente} onOpenChange={() => setEditingCliente(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingCliente && (
            <ClienteForm cliente={editingCliente} onSuccess={() => setEditingCliente(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCliente} onOpenChange={() => setDeletingCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente{' '}
              <strong>{deletingCliente?.razao_social}</strong>? Esta ação não pode ser desfeita.
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