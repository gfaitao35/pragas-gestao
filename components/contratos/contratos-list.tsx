'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Search, X } from 'lucide-react'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'

interface Contrato {
  id: string
  numero_contrato: string
  razao_social: string | null
  status: string
  data_inicio: string
  data_fim: string
  valor_total: number
  numero_parcelas: number
  valor_parcela: number
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-800' },
  suspenso: { label: 'Suspenso', className: 'bg-amber-100 text-amber-800' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
  concluido: { label: 'Concluído', className: 'bg-blue-100 text-blue-800' },
}

export function ContratosList({ contratos }: { contratos: Contrato[] }) {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const filtered = contratos.filter((contrato) => {
    const matchStatus = filtroStatus === 'todos' || contrato.status === filtroStatus
    if (!matchStatus) return false

    if (!busca) return true

    const search = busca.toLowerCase()
    return (
      (contrato.numero_contrato && contrato.numero_contrato.toLowerCase().includes(search)) ||
      (contrato.razao_social && contrato.razao_social.toLowerCase().includes(search))
    )
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Contratos</CardTitle>
        <CardDescription>Contratos de servico cadastrados no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por N. do contrato, nome do cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-9"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {busca || filtroStatus !== 'todos' ? (
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'contrato encontrado' : 'contratos encontrados'}
            {busca ? ` para "${busca}"` : ''}
            {filtroStatus !== 'todos' ? ` com status "${statusConfig[filtroStatus]?.label || filtroStatus}"` : ''}
          </p>
        ) : null}

        {/* Contract list */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((contrato) => {
              const badge = statusConfig[contrato.status] || { label: contrato.status, className: 'bg-muted text-muted-foreground' }
              return (
                <div key={contrato.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{contrato.numero_contrato}</p>
                    <p className="text-sm text-muted-foreground">
                      {contrato.razao_social || 'Cliente não encontrado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contrato.numero_parcelas} parcelas de{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(contrato.valor_parcela)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateBRFromYYYYMMDD(contrato.data_inicio)} até{' '}
                      {formatDateBRFromYYYYMMDD(contrato.data_fim)}
                    </span>
                    <Link href={`/dashboard/contratos/${contrato.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-2 h-12 w-12 text-muted-foreground/50" />
            {busca || filtroStatus !== 'todos' ? (
              <>
                <p className="text-muted-foreground">Nenhum contrato encontrado com os filtros aplicados</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setBusca('')
                    setFiltroStatus('todos')
                  }}
                >
                  Limpar filtros
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                <p className="text-sm text-muted-foreground">Comece criando um novo contrato</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
