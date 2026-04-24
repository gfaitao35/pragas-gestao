'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Calendar, DollarSign, FileText, CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { BaixaParcelaDialog } from '@/components/financeiro/baixa-parcela-dialog'
import { toast } from 'sonner'
import { formatDateBRFromYYYYMMDD, parseDateFromYYYYMMDD, startOfDay } from '@/lib/utils'

interface Contrato {
  id: string
  numero_contrato: string
  cliente_id: string
  razao_social: string
  nome_fantasia: string | null
  data_inicio: string
  data_fim: string
  valor_total: number
  numero_parcelas: number
  valor_parcela: number
  dia_vencimento: number
  status: string
  observacoes: string | null
  created_at: string
}

interface Parcela {
  id: string
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
  data_pagamento: string | null
  valor_pago: number | null
  status: string
  forma_pagamento: string | null
}

export default function ContratoDetalhesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Dialogs
  const [showEditContrato, setShowEditContrato] = useState(false)
  const [showDeleteContrato, setShowDeleteContrato] = useState(false)
  const [showDeleteParcela, setShowDeleteParcela] = useState<string | null>(null)
  const [showEditParcela, setShowEditParcela] = useState<Parcela | null>(null)
  const [saving, setSaving] = useState(false)

  const [editForm, setEditForm] = useState({
    valor_total: '', numero_parcelas: '', valor_parcela: '', dia_vencimento: '',
    data_inicio: '', data_fim: '', status: '', observacoes: ''
  })
  const [editParcelaForm, setEditParcelaForm] = useState({ valor_parcela: '', data_vencimento: '' })
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [editingDateValue, setEditingDateValue] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchContrato()
  }, [id, refreshKey])

  const fetchContrato = async () => {
    try {
      setLoading(true)
      console.log('fetchContrato - id:', id)
      const response = await fetch(`/api/contratos/${id}`)
      console.log('fetchContrato - response.status:', response.status)
      const text = await response.text()
      console.log('fetchContrato - response.text:', text)
      if (response.ok) {
        const data = JSON.parse(text)
        setContrato(data.contrato)
        setParcelas(data.parcelas)
      } else {
        console.log('fetchContrato - not ok, redirecting')
        router.push('/dashboard/contratos')
      }
    } catch {
      console.error('fetchContrato - exception')
      router.push('/dashboard/contratos')
    } finally {
      setLoading(false)
    }
  }

  const saveDate = async (parcelaId: string) => {
    if (!editingDateValue) return
    setSavingDate(true)
    try {
      const res = await fetch(`/api/parcelas/${parcelaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_vencimento: editingDateValue }),
      })
      if (res.ok) {
        toast.success('Data de vencimento atualizada!')
        setEditingDateId(null)
        setRefreshKey(p => p + 1)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as any).error || 'Erro ao atualizar data')
      }
    } catch {
      toast.error('Erro ao atualizar data')
    } finally {
      setSavingDate(false)
    }
  }

  const openEditContrato = () => {
    if (!contrato) return
    setEditForm({
      valor_total: String(contrato.valor_total),
      numero_parcelas: String(contrato.numero_parcelas),
      valor_parcela: String(contrato.valor_parcela),
      dia_vencimento: String(contrato.dia_vencimento),
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim,
      status: contrato.status,
      observacoes: contrato.observacoes || ''
    })
    setShowEditContrato(true)
  }

  const handleEditContrato = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contratos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor_total: parseFloat(editForm.valor_total),
          numero_parcelas: parseInt(editForm.numero_parcelas),
          valor_parcela: parseFloat(editForm.valor_parcela),
          dia_vencimento: parseInt(editForm.dia_vencimento),
          data_inicio: editForm.data_inicio,
          data_fim: editForm.data_fim,
          status: editForm.status,
          observacoes: editForm.observacoes,
        }),
      })
      if (res.ok) {
        toast.success('Contrato atualizado com sucesso!')
        setShowEditContrato(false)
        setRefreshKey(p => p + 1)
      } else {
        toast.error('Erro ao atualizar contrato')
      }
    } catch {
      toast.error('Erro ao atualizar contrato')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContrato = async () => {
    try {
      const res = await fetch(`/api/contratos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Contrato excluido com sucesso!')
        router.push('/dashboard/contratos')
      } else {
        toast.error('Erro ao excluir contrato')
      }
    } catch {
      toast.error('Erro ao excluir contrato')
    }
  }

  const handleChangeStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/contratos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Status alterado para ${getStatusBadge(newStatus).label}`)
        setRefreshKey(p => p + 1)
      }
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  const handleDeleteParcela = async (parcelaId: string) => {
    try {
      const res = await fetch(`/api/parcelas/${parcelaId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Parcela excluida!')
        setShowDeleteParcela(null)
        setRefreshKey(p => p + 1)
      } else {
        toast.error('Erro ao excluir parcela')
      }
    } catch { toast.error('Erro ao excluir parcela') }
  }

  const handleEditParcela = async () => {
    if (!showEditParcela) return
    setSaving(true)
    try {
      const res = await fetch(`/api/parcelas/${showEditParcela.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: showEditParcela.status,
          data_pagamento: showEditParcela.data_pagamento,
          valor_pago: parseFloat(editParcelaForm.valor_parcela) || showEditParcela.valor_parcela,
          forma_pagamento: showEditParcela.forma_pagamento,
        }),
      })
      if (res.ok) {
        toast.success('Parcela atualizada!')
        setShowEditParcela(null)
        setRefreshKey(p => p + 1)
      }
    } catch { toast.error('Erro ao atualizar parcela') }
    finally { setSaving(false) }
  }

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
      suspenso: { label: 'Suspenso', className: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      concluido: { label: 'Concluído', className: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      paga: { label: 'Paga', className: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
      pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
      atrasada: { label: 'Atrasada', className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      cancelada: { label: 'Cancelada', className: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
    }
    return cfg[status] || { label: status, className: 'bg-muted text-muted-foreground', icon: null }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const isVencida = (d: string) => (parseDateFromYYYYMMDD(d) || new Date(0)) < startOfDay(new Date())
  const isProximaVencer = (d: string) => {
    const dt = parseDateFromYYYYMMDD(d) || new Date(0)
    const diff = (dt.getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!contrato) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Contrato não encontrado</p></div>

  const parcelasPagas = parcelas.filter(p => p.status === 'paga').length
  const parcelasAtrasadas = parcelas.filter(p => (p.status === 'atrasada') || (p.status === 'pendente' && isVencida(p.data_vencimento))).length
  const valorRecebido = parcelas.filter(p => p.status === 'paga').reduce((s, p) => s + (p.valor_pago || p.valor_parcela), 0)
  const valorPendente = parcelas.filter(p => p.status !== 'paga' && p.status !== 'cancelada').reduce((s, p) => s + p.valor_parcela, 0)
  const progressPercent = contrato.numero_parcelas > 0 ? Math.round((parcelasPagas / contrato.numero_parcelas) * 100) : 0
  const proximaParcela = parcelas.find(p => p.status === 'pendente' || p.status === 'atrasada')

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contratos">
            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contrato {contrato.numero_contrato}</h1>
            <p className="text-muted-foreground">{contrato.razao_social}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={contrato.status} onValueChange={handleChangeStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={openEditContrato}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteContrato(true)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
        </div>
      </div>

      {/* Contract Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Informações do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                <p className="text-lg font-semibold">{contrato.razao_social}</p>
                {contrato.nome_fantasia && <p className="text-sm text-muted-foreground">{contrato.nome_fantasia}</p>}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusBadge(contrato.status).className}>
                    {getStatusBadge(contrato.status).label}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Período</p>
                <p className="font-medium">{formatDateBRFromYYYYMMDD(contrato.data_inicio)} até {formatDateBRFromYYYYMMDD(contrato.data_fim)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(contrato.valor_total)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Condições</p>
                <p className="font-medium">{contrato.numero_parcelas}x de {formatCurrency(contrato.valor_parcela)}</p>
                <p className="text-sm text-muted-foreground">Vencimento dia {contrato.dia_vencimento}</p>
              </div>
            </div>
          </div>
          {contrato.observacoes && (
            <div className="mt-4 p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium text-muted-foreground">Observações</p>
              <p className="text-sm mt-1">{contrato.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progresso</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <Progress value={progressPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{parcelasPagas}/{contrato.numero_parcelas} pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(valorRecebido)}</div>
            <p className="text-xs text-muted-foreground">{parcelasPagas} parcelas pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(valorPendente)}</div>
            <p className="text-xs text-muted-foreground">{contrato.numero_parcelas - parcelasPagas} restantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parcelasAtrasadas > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{parcelasAtrasadas}</div>
            {proximaParcela && (
              <p className="text-xs text-muted-foreground">Próxima: {formatDateBRFromYYYYMMDD(proximaParcela.data_vencimento)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parcelas List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Parcelas</CardTitle>
              <CardDescription>Gerencie as parcelas do contrato</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {parcelas.length > 0 ? (
            <div className="space-y-3">
              {parcelas.map((parcela) => {
                const sb = getStatusBadge(parcela.status)
                const atrasada = parcela.status === 'pendente' && isVencida(parcela.data_vencimento)
                const proxima = parcela.status === 'pendente' && isProximaVencer(parcela.data_vencimento)
                let borderColor = 'border-border'
                if (parcela.status === 'paga') borderColor = 'border-emerald-300 bg-emerald-50/50'
                else if (atrasada || parcela.status === 'atrasada') borderColor = 'border-red-300 bg-red-50/50'
                else if (proxima) borderColor = 'border-amber-300 bg-amber-50/50'

                return (
                  <div key={parcela.id} className={`flex items-center justify-between rounded-lg border p-4 ${borderColor}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Parcela {parcela.numero_parcela}/{contrato.numero_parcelas}</p>
                        {atrasada && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
                        {proxima && <Badge className="bg-amber-100 text-amber-800 text-xs">Vence em breve</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {editingDateId === parcela.id ? (
                          <>
                            <Input
                              type="date"
                              value={editingDateValue}
                              onChange={e => setEditingDateValue(e.target.value)}
                              className="h-7 text-xs w-36"
                              autoFocus
                            />
                            <button
                              onClick={() => saveDate(parcela.id)}
                              disabled={savingDate}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Salvar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingDateId(null)}
                              className="text-red-500 hover:text-red-700"
                              title="Cancelar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Vencimento: {formatDateBRFromYYYYMMDD(parcela.data_vencimento)}</p>
                            <button
                              onClick={() => { setEditingDateId(parcela.id); setEditingDateValue(parcela.data_vencimento) }}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              title="Editar data de vencimento"
                            >
                              <Pencil className="h-3 w-3" />
                              Alterar
                            </button>
                          </>
                        )}
                      </div>
                      {parcela.data_pagamento && <p className="text-sm text-muted-foreground">Pago em: {formatDateBRFromYYYYMMDD(parcela.data_pagamento)} {parcela.forma_pagamento ? `(${parcela.forma_pagamento})` : ''}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(parcela.valor_parcela)}</p>
                        {parcela.valor_pago != null && parcela.valor_pago !== parcela.valor_parcela && (
                          <p className="text-xs text-muted-foreground">Pago: {formatCurrency(parcela.valor_pago)}</p>
                        )}
                      </div>
                      <Badge className={sb.className}>{sb.label}</Badge>
                      <div className="flex gap-1">
                        {parcela.status !== 'paga' && parcela.status !== 'cancelada' && (
                          <BaixaParcelaDialog parcela={parcela} onUpdate={() => setRefreshKey(p => p + 1)} />
                        )}
                        {parcela.status !== 'paga' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDeleteParcela(parcela.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma parcela encontrada</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Contrato Dialog */}
      <Dialog open={showEditContrato} onOpenChange={setShowEditContrato}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
            <DialogDescription>Altere os dados do contrato {contrato.numero_contrato}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Valor Total</Label><Input type="number" step="0.01" value={editForm.valor_total} onChange={e => { const v = e.target.value; setEditForm(p => ({ ...p, valor_total: v, valor_parcela: p.numero_parcelas ? String((parseFloat(v) / parseInt(p.numero_parcelas)).toFixed(2)) : p.valor_parcela })) }} /></div>
              <div><Label className="text-xs">Num. Parcelas</Label><Input type="number" value={editForm.numero_parcelas} onChange={e => { const n = e.target.value; setEditForm(p => ({ ...p, numero_parcelas: n, valor_parcela: p.valor_total ? String((parseFloat(p.valor_total) / parseInt(n || '1')).toFixed(2)) : p.valor_parcela })) }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Valor Parcela</Label><Input type="number" step="0.01" value={editForm.valor_parcela} onChange={e => setEditForm(p => ({ ...p, valor_parcela: e.target.value }))} /></div>
              <div><Label className="text-xs">Dia Vencimento</Label><Input type="number" min="1" max="31" value={editForm.dia_vencimento} onChange={e => setEditForm(p => ({ ...p, dia_vencimento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Data Inicio</Label><Input type="date" value={editForm.data_inicio} onChange={e => setEditForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
              <div><Label className="text-xs">Data Fim</Label><Input type="date" value={editForm.data_fim} onChange={e => setEditForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea value={editForm.observacoes} onChange={e => setEditForm(p => ({ ...p, observacoes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContrato(false)}>Cancelar</Button>
            <Button onClick={handleEditContrato} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contrato Confirmation */}
      <AlertDialog open={showDeleteContrato} onOpenChange={setShowDeleteContrato}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação irá excluir o contrato {contrato.numero_contrato} e todas as suas parcelas. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContrato} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Parcela Confirmation */}
      <AlertDialog open={!!showDeleteParcela} onOpenChange={() => setShowDeleteParcela(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Parcela?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação irá excluir a parcela permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteParcela && handleDeleteParcela(showDeleteParcela)} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}