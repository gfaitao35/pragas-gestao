'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { liquidarOrdemAction, desfazerLiquidacaoAction } from '@/app/dashboard/ordens/actions'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, XCircle, FileDown, DollarSign, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateOrderPDF } from '@/lib/pdf-os'
import type { OrdemServico } from '@/lib/types'
import { toLocalDateInput, formatDateBRFromYYYYMMDD } from '@/lib/utils'

interface FinanceiroTableProps {
  ordens: OrdemServico[]
}

interface Lancamento {
  id: string
  descricao: string
  valor: number
  data_lancamento: string
  status: string
  data_pagamento?: string
}

export function FinanceiroTable({ ordens }: FinanceiroTableProps) {
  const [filter, setFilter] = useState<string>('all')
  const [liquidandoOrdem, setLiquidandoOrdem] = useState<OrdemServico | null>(null)
  const [dataLiquidacao, setDataLiquidacao] = useState(() => toLocalDateInput())
  const [valorPago, setValorPago] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [desfazendoOrdem, setDesfazendoOrdem] = useState<OrdemServico | null>(null)
  const [expandedOS, setExpandedOS] = useState<string | null>(null)
  const [lancamentosOS, setLancamentosOS] = useState<Record<string, Lancamento[]>>({})
  const [loadingLanc, setLoadingLanc] = useState<string | null>(null)
  const [liquidandoParcela, setLiquidandoParcela] = useState<Lancamento | null>(null)
  const [dataParcela, setDataParcela] = useState(() => toLocalDateInput())
  const [savingParcela, setSavingParcela] = useState(false)
  const router = useRouter()

  const filteredOrdens = ordens.filter((o) => {
    if (filter === 'pendentes') return !o.liquidado
    if (filter === 'liquidados') return o.liquidado
    return true
  })

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string | null) => formatDateBRFromYYYYMMDD(dateStr)

  const handleOpenLiquidar = (ordem: OrdemServico) => {
    setLiquidandoOrdem(ordem)
    setDataLiquidacao(toLocalDateInput())
    setValorPago(ordem.valor != null ? String(ordem.valor) : '')
  }

  const handleLiquidar = async () => {
    if (!liquidandoOrdem) return
    setLoading(true)
    const result = await liquidarOrdemAction(liquidandoOrdem.id, {
      data_liquidacao: dataLiquidacao,
      valor_pago: valorPago ? parseFloat(valorPago) : liquidandoOrdem.valor,
    })
    setLoading(false)
    if (result?.error) { toast.error(result.error); return }
    toast.success('OS liquidada com sucesso')
    setLiquidandoOrdem(null)
    router.refresh()
  }

  const handleDesfazer = async () => {
    if (!desfazendoOrdem) return
    const result = await desfazerLiquidacaoAction(desfazendoOrdem.id)
    if (result?.error) { toast.error(result.error); return }
    toast.success('Liquidação desfeita')
    setDesfazendoOrdem(null)
    router.refresh()
  }

  const handlePrintOS = async (ordem: OrdemServico) => {
    await generateOrderPDF(ordem)
    toast.success('Impressão da OS aberta')
  }

  const toggleExpandOS = async (osId: string) => {
    if (expandedOS === osId) { setExpandedOS(null); return }
    setExpandedOS(osId)
    if (lancamentosOS[osId]) return
    setLoadingLanc(osId)
    try {
      const res = await fetch('/api/lancamentos')
      if (res.ok) {
        const all: any[] = await res.json()
        const filtrados = all.filter((l) => l.referencia_id === osId && l.referencia_tipo === 'os')
        setLancamentosOS(prev => ({ ...prev, [osId]: filtrados }))
      }
    } catch {}
    finally { setLoadingLanc(null) }
  }

  const handlePagarParcela = async () => {
    if (!liquidandoParcela) return
    setSavingParcela(true)
    try {
      const res = await fetch(`/api/lancamentos/${liquidandoParcela.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago', data_pagamento: dataParcela }),
      })
      if (res.ok) {
        toast.success('Parcela marcada como paga!')
        const osId = Object.keys(lancamentosOS).find(k => lancamentosOS[k].some(l => l.id === liquidandoParcela.id))
        if (osId) {
          setLancamentosOS(prev => ({
            ...prev,
            [osId]: prev[osId].map(l => l.id === liquidandoParcela.id ? { ...l, status: 'pago', data_pagamento: dataParcela } : l)
          }))
        }
        setLiquidandoParcela(null)
        router.refresh()
      } else {
        toast.error('Erro ao pagar parcela')
      }
    } catch { toast.error('Erro ao pagar parcela') }
    finally { setSavingParcela(false) }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="liquidados">Liquidadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOrdens.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo de Serviço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Liquidação</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrdens.map((ordem) => {
                    const isParcelada = (ordem as any).num_parcelas > 1
                    const isExpanded = expandedOS === ordem.id
                    const parcelas = lancamentosOS[ordem.id] || []
                    const pagas = parcelas.filter(p => p.status === 'pago').length
                    return (
                      <React.Fragment key={ordem.id}>
                        <TableRow key={ordem.id}>
                          <TableCell className="font-mono font-medium">{ordem.numero_os}</TableCell>
                          <TableCell>{(ordem.cliente as { razao_social?: string } | undefined)?.razao_social ?? '-'}</TableCell>
                          <TableCell>{ordem.tipo_servico}</TableCell>
                          <TableCell>{formatCurrency(ordem.valor)}</TableCell>
                          <TableCell>
                            {isParcelada ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                {pagas > 0 ? `${pagas}/${(ordem as any).num_parcelas} pagas` : `${(ordem as any).num_parcelas}x parcelas`}
                              </Badge>
                            ) : (
                              <Badge variant={ordem.liquidado ? 'default' : 'secondary'} className={ordem.liquidado ? 'bg-emerald-600' : 'bg-amber-100 text-amber-800'}>
                                {ordem.liquidado ? 'Liquidado' : 'Pendente'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(ordem.data_liquidacao)}</TableCell>
                          <TableCell>{ordem.liquidado ? formatCurrency(ordem.valor_pago ?? ordem.valor) : '-'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePrintOS(ordem)}>
                                  <FileDown className="mr-2 h-4 w-4" />Imprimir OS
                                </DropdownMenuItem>
                                {isParcelada ? (
                                  <DropdownMenuItem onClick={() => toggleExpandOS(ordem.id)}>
                                    {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                    {isExpanded ? 'Ocultar Parcelas' : 'Ver / Receber Parcelas'}
                                  </DropdownMenuItem>
                                ) : !ordem.liquidado ? (
                                  <DropdownMenuItem onClick={() => handleOpenLiquidar(ordem)}>
                                    <DollarSign className="mr-2 h-4 w-4" />Liquidar OS
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setDesfazendoOrdem(ordem)}>
                                    <XCircle className="mr-2 h-4 w-4" />Desfazer liquidação
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Parcelas expandidas */}
                        {isParcelada && isExpanded && (
                          <TableRow key={`${ordem.id}-parcelas`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="px-6 py-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                  Parcelas — OS {ordem.numero_os}
                                </p>
                                {loadingLanc === ordem.id ? (
                                  <p className="text-sm text-muted-foreground">Carregando...</p>
                                ) : parcelas.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Nenhuma parcela encontrada.</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-muted-foreground">
                                        <th className="text-left pb-2 font-medium">Descrição</th>
                                        <th className="text-left pb-2 font-medium">Vencimento</th>
                                        <th className="text-left pb-2 font-medium">Valor</th>
                                        <th className="text-left pb-2 font-medium">Status</th>
                                        <th className="pb-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {parcelas.map(p => (
                                        <tr key={p.id} className="border-t border-border/40">
                                          <td className="py-2">{p.descricao}</td>
                                          <td className="py-2">{formatDate(p.data_lancamento)}</td>
                                          <td className="py-2 font-medium">{formatCurrency(p.valor)}</td>
                                          <td className="py-2">
                                            {p.status === 'pago'
                                              ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Pago</Badge>
                                              : <Badge className="bg-amber-100 text-amber-800 text-xs">Pendente</Badge>
                                            }
                                          </td>
                                          <td className="py-2">
                                            {p.status === 'pendente' && (
                                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                                onClick={() => { setLiquidandoParcela(p); setDataParcela(toLocalDateInput()) }}>
                                                <CheckCircle2 className="mr-1 h-3 w-3" />Receber
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhuma ordem encontrada</h3>
              <p className="text-sm text-muted-foreground">
                {filter !== 'all' ? 'Tente outro filtro.' : 'As ordens de serviço aparecem aqui para liquidação.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog liquidar OS à vista */}
      <Dialog open={!!liquidandoOrdem} onOpenChange={() => !loading && setLiquidandoOrdem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Liquidar OS</DialogTitle></DialogHeader>
          {liquidandoOrdem && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                OS <strong>{liquidandoOrdem.numero_os}</strong> – {(liquidandoOrdem.cliente as { razao_social?: string })?.razao_social} – {formatCurrency(liquidandoOrdem.valor)}
              </p>
              <div className="space-y-2">
                <Label htmlFor="data_liquidacao">Data da liquidação</Label>
                <Input id="data_liquidacao" type="date" value={dataLiquidacao} onChange={(e) => setDataLiquidacao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_pago">Valor pago (opcional)</Label>
                <Input id="valor_pago" type="number" step="0.01" min="0" placeholder={String(liquidandoOrdem.valor ?? '')} value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
                <p className="text-xs text-muted-foreground">Deixe em branco para usar o valor da OS</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiquidandoOrdem(null)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleLiquidar} disabled={loading}>{loading ? 'Salvando...' : 'Confirmar liquidação'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog receber parcela individual */}
      <Dialog open={!!liquidandoParcela} onOpenChange={() => !savingParcela && setLiquidandoParcela(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Parcela</DialogTitle></DialogHeader>
          {liquidandoParcela && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <strong>{liquidandoParcela.descricao}</strong> — {formatCurrency(liquidandoParcela.valor)}
              </p>
              <div className="space-y-2">
                <Label>Data do recebimento</Label>
                <Input type="date" value={dataParcela} onChange={e => setDataParcela(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiquidandoParcela(null)} disabled={savingParcela}>Cancelar</Button>
            <Button onClick={handlePagarParcela} disabled={savingParcela}>{savingParcela ? 'Salvando...' : 'Confirmar Recebimento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!desfazendoOrdem} onOpenChange={() => setDesfazendoOrdem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer liquidação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desfazer a liquidação da OS <strong>{desfazendoOrdem?.numero_os}</strong>? A OS voltará a aparecer como pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesfazer} className="bg-amber-600 hover:bg-amber-700">Desfazer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
