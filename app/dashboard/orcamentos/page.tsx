'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, FileDown, Pencil, Trash2, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { generateOrcamentoPDF } from '@/lib/pdf-orcamento'

type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

const statusLabels: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

const statusVariant: Record<
  StatusOrcamento,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  rascunho: 'secondary',
  enviado: 'default',
  aprovado: 'default',
  recusado: 'destructive',
}

// armazenamento temporário
let orcamentosStore: any[] = []

export default function OrcamentosPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [orcamentos, setOrcamentos] = useState<any[]>(orcamentosStore)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => {
    const stored = localStorage.getItem('orcamentos')
    if (stored) {
      setOrcamentos(JSON.parse(stored))
    }
  }, [])

  const filtered = orcamentos.filter(o => {
    const matchBusca =
      !busca || o.cliente?.nome?.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || o.status === filtroStatus
    return matchBusca && matchStatus
  })

  const handleOpenNew = () => {
    router.push('/dashboard/orcamentos/novo')
  }

  const handleOpenEdit = (orc: any) => {
    router.push(`/dashboard/orcamentos/${orc.id}`)
  }

  const handleDelete = (id: string) => {
    const novaLista = orcamentos.filter(o => o.id !== id)
    setOrcamentos(novaLista)
    localStorage.setItem('orcamentos', JSON.stringify(novaLista))
    toast({ title: 'Orçamento excluído' })
  }

  const handleStatusChange = (id: string, status: StatusOrcamento) => {
    const novaLista = orcamentos.map(o =>
      o.id === id ? { ...o, status } : o
    )

    setOrcamentos(novaLista)
    localStorage.setItem('orcamentos', JSON.stringify(novaLista))
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie suas propostas comerciais
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            placeholder="Buscar por cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="mb-3 h-12 w-12 opacity-40" />
              <p>Nenhum orçamento encontrado</p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro orçamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((orc: any) => (
                  <TableRow key={orc.id}>
                    <TableCell className="font-medium">{orc.numero}</TableCell>
                    <TableCell>{orc.cliente?.nome || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {orc.tituloServico || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R${' '}
                      {orc.valorInvestimento?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(orc.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={orc.status}
                        onValueChange={v =>
                          handleStatusChange(orc.id, v as StatusOrcamento)
                        }
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <Badge
                            variant={statusVariant[orc.status as StatusOrcamento]}
                            className={`text-xs ${
                              orc.status === 'aprovado'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : ''
                            }`}
                          >
                            {statusLabels[orc.status as StatusOrcamento]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="recusado">Recusado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => generateOrcamentoPDF(orc)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEdit(orc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(orc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}