'use client'

import { useState, useCallback, useEffect } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarDays,
  FileSpreadsheet,
  Loader2
} from 'lucide-react'

// =============================================
// TIPOS
// =============================================
interface ReportData {
  mes: string
  mes_anterior: string
  stats: {
    current: {
      total_os: number
      os_concluidas: number
      valor_total: number
      valor_liquidado: number
      clientes_atendidos: number
    }
    previous: {
      total_os: number
      os_concluidas: number
      valor_total: number
      valor_liquidado: number
      clientes_atendidos: number
    }
  }
  servicos_por_tipo: Array<{ tipo_servico: string; quantidade: number; valor_total: number }>
  top_clientes: Array<{ razao_social: string; quantidade_os: number; valor_total: number }>
  ordens: Array<{
    id: string; numero_os: string; razao_social: string; tipo_servico: string
    valor: number; status: string; data_execucao: string; liquidado: number
    valor_pago: number; descricao_servico: string; tecnico_responsavel: string
  }>
  contratos: Array<{
    id: string; numero_contrato: string; razao_social: string; valor_total: number
    numero_parcelas: number; status: string; data_inicio: string; data_fim: string
    parcelas_pagas: number; valor_recebido_mes: number
  }>
  parcelas: Array<{
    id: string; numero_parcela: number; valor_parcela: number; data_vencimento: string
    data_pagamento: string; valor_pago: number; status: string; forma_pagamento: string
    numero_contrato: string; razao_social: string
  }>
  lancamentos: Array<{
    id: string; tipo: string; descricao: string; valor: number; data_lancamento: string
    data_pagamento: string; status: string; forma_pagamento: string; referencia_tipo: string
    categoria_nome: string; categoria_cor: string
  }>
  resumo: {
    receita_total: number
    despesa_total: number
    lucro_atual: number
    os_recebido: number
    parcelas_recebidas: number
    receitas_avulsas: number
    despesas_pagas: number
    receitas_pendentes: number
    despesas_pendentes: number
  }
  meta: { id: string; valor_meta: number; observacoes: string } | null
}

// =============================================
// HELPERS
// =============================================
const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Erro ao carregar dados')
  return r.json()
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDateBR(value?: string | null) {
  if (!value) return '-'
  const parts = value.split('-')
  if (parts.length < 3) return value
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function getPercentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function getMonthLabel(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const date = new Date(y, m - 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function navigateMonth(mes: string, direction: number) {
  const [y, m] = mes.split('-').map(Number)
  const date = new Date(y, m - 1 + direction)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const statusMap: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
  concluida: { label: 'Concluida', className: 'bg-emerald-100 text-emerald-800' },
  cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
  paga: { label: 'Paga', className: 'bg-emerald-100 text-emerald-800' },
  atrasada: { label: 'Atrasada', className: 'bg-red-100 text-red-800' },
  pago: { label: 'Pago', className: 'bg-emerald-100 text-emerald-800' },
  ativo: { label: 'Ativo', className: 'bg-blue-100 text-blue-800' },
  concluido: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-800' },
  suspenso: { label: 'Suspenso', className: 'bg-amber-100 text-amber-800' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' }
}

function StatusBadge({ status }: { status: string }) {
  const info = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
export default function RelatorioMensalClient() {
  const now = new Date()
  const [mes, setMes] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [metaDialogOpen, setMetaDialogOpen] = useState(false)
  const [metaValue, setMetaValue] = useState('')
  const [metaObs, setMetaObs] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { data, error, isLoading } = useSWR<ReportData>(
    `/api/relatorios/mensal?mes=${mes}`,
    fetcher
  )

  // Preencher meta dialog quando data carrega
  useEffect(() => {
    if (data?.meta) {
      setMetaValue(String(data.meta.valor_meta))
      setMetaObs(data.meta.observacoes || '')
    } else {
      setMetaValue('')
      setMetaObs('')
    }
  }, [data?.meta])

  const handleSaveMeta = useCallback(async () => {
    const valor = parseFloat(metaValue.replace(/[^\d.,]/g, '').replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return

    setSavingMeta(true)
    try {
      await fetch('/api/relatorios/mensal/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, valor_meta: valor, observacoes: metaObs })
      })
      globalMutate(`/api/relatorios/mensal?mes=${mes}`)
      setMetaDialogOpen(false)
    } catch (e) {
      console.error('Erro ao salvar meta:', e)
    } finally {
      setSavingMeta(false)
    }
  }, [mes, metaValue, metaObs])

  const handleExportExcel = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/relatorios/mensal/exportar?mes=${mes}`)
      if (!res.ok) throw new Error('Erro ao exportar')
      const exportData = await res.json()

      // Importar xlsx dinamicamente
      const XLSX = await import('xlsx')

      const wb = XLSX.utils.book_new()

      // -- Aba Resumo --
      const resumoRows = [
        ['RELATORIO MENSAL - ' + getMonthLabel(mes).toUpperCase()],
        [],
        ['RESUMO FINANCEIRO'],
        ['Total de OS', exportData.resumo.total_os],
        ['OS Concluidas', exportData.resumo.os_concluidas],
        ['Faturamento OS', exportData.resumo.faturamento_os],
        ['Recebido OS', exportData.resumo.recebido_os],
        ['Receitas Avulsas', exportData.resumo.receitas_avulsas],
        ['Despesas', exportData.resumo.despesas],
        ['Lucro', (exportData.resumo.recebido_os || 0) + (exportData.resumo.receitas_avulsas || 0) - (exportData.resumo.despesas || 0)]
      ]
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows)
      wsResumo['!cols'] = [{ wch: 25 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

      // -- Aba Ordens de Servico --
      if (exportData.ordens?.length > 0) {
        const osHeaders = ['N. OS', 'Cliente', 'Tipo Servico', 'Descrição', 'Valor', 'Status', 'Data Execução', 'Liquidado', 'Valor Pago', 'Data Liquidação', 'Tecnico', 'Local']
        const osRows = exportData.ordens.map((o: any) => [
          o.numero_os, o.razao_social, o.tipo_servico, o.descricao_servico,
          o.valor, o.status === 'concluida' ? 'Concluida' : o.status === 'pendente' ? 'Pendente' : o.status === 'em_andamento' ? 'Em Andamento' : o.status,
          formatDateBR(o.data_execucao), o.liquidado ? 'Sim' : 'Não', o.valor_pago,
          formatDateBR(o.data_liquidacao), o.tecnico_responsavel, o.local_execucao
        ])
        const wsOS = XLSX.utils.aoa_to_sheet([osHeaders, ...osRows])
        wsOS['!cols'] = osHeaders.map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, wsOS, 'Ordens de Servico')
      }

      // -- Aba Contratos --
      if (exportData.contratos?.length > 0) {
        const ctHeaders = ['N. Contrato', 'Cliente', 'Valor Total', 'Parcelas', 'Valor Parcela', 'Status', 'Inicio', 'Fim', 'Dia Vencimento']
        const ctRows = exportData.contratos.map((c: any) => [
          c.numero_contrato, c.razao_social, c.valor_total, c.numero_parcelas,
          c.valor_parcela, c.status, formatDateBR(c.data_inicio), formatDateBR(c.data_fim), c.dia_vencimento
        ])
        const wsCT = XLSX.utils.aoa_to_sheet([ctHeaders, ...ctRows])
        wsCT['!cols'] = ctHeaders.map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, wsCT, 'Contratos')
      }

      // -- Aba Parcelas --
      if (exportData.parcelas?.length > 0) {
        const pHeaders = ['Contrato', 'Cliente', 'N. Parcela', 'Valor', 'Vencimento', 'Pagamento', 'Valor Pago', 'Status', 'Forma Pgto']
        const pRows = exportData.parcelas.map((p: any) => [
          p.numero_contrato, p.razao_social, p.numero_parcela, p.valor_parcela,
          formatDateBR(p.data_vencimento), formatDateBR(p.data_pagamento),
          p.valor_pago, p.status === 'paga' ? 'Paga' : p.status === 'pendente' ? 'Pendente' : p.status,
          p.forma_pagamento
        ])
        const wsP = XLSX.utils.aoa_to_sheet([pHeaders, ...pRows])
        wsP['!cols'] = pHeaders.map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, wsP, 'Parcelas')
      }

      // -- Aba Despesas e Receitas Avulsas --
      if (exportData.lancamentos?.length > 0) {
        const lHeaders = ['Tipo', 'Descrição', 'Categoria', 'Valor', 'Data', 'Status', 'Forma Pgto', 'Origem']
        const lRows = exportData.lancamentos.map((l: any) => [
          l.tipo === 'receita' ? 'Receita' : 'Despesa',
          l.descricao, l.categoria_nome || '-', l.valor,
          formatDateBR(l.data_lancamento),
          l.status === 'pago' ? 'Pago' : l.status === 'pendente' ? 'Pendente' : l.status,
          l.forma_pagamento || '-',
          l.referencia_tipo === 'manual' ? 'Manual' : l.referencia_tipo === 'os' ? 'OS' : l.referencia_tipo === 'contrato' ? 'Contrato' : l.referencia_tipo || '-'
        ])
        const wsL = XLSX.utils.aoa_to_sheet([lHeaders, ...lRows])
        wsL['!cols'] = lHeaders.map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, wsL, 'Despesas e Receitas')
      }

      // Download
      XLSX.writeFile(wb, `relatorio-mensal-${mes}.xlsx`)
    } catch (e) {
      console.error('Erro ao exportar Excel:', e)
    } finally {
      setExporting(false)
    }
  }, [mes])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Erro ao carregar relatorio. Tente novamente.</p>
      </div>
    )
  }

  const { stats, resumo, meta } = data
  const metaPercent = meta ? Math.min((resumo.lucro_atual / meta.valor_meta) * 100, 100) : 0
  const metaAtingida = meta ? resumo.lucro_atual >= meta.valor_meta : false

  return (
    <div className="space-y-6">
      {/* ========== HEADER + NAVEGACAO ========== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Relatório Mensal</h1>
          <p className="text-sm text-muted-foreground">
            Visao detalhada do desempenho de {getMonthLabel(mes)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegacao meses */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMes(navigateMonth(mes, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Mes anterior</span>
            </Button>
            <div className="flex items-center gap-1.5 px-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground capitalize">
                {getMonthLabel(mes)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMes(navigateMonth(mes, 1))}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Próximo mês</span>
            </Button>
          </div>

          {/* Exportar Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* ========== CARDS STATS ========== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total OS"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          value={String(stats.current.total_os)}
          change={getPercentageChange(stats.current.total_os, stats.previous.total_os)}
        />
        <StatCard
          title="OS Concluidas"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          value={String(stats.current.os_concluidas)}
          change={getPercentageChange(stats.current.os_concluidas, stats.previous.os_concluidas)}
        />
        <StatCard
          title="Faturamento"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          value={formatCurrency(stats.current.valor_total)}
          change={getPercentageChange(stats.current.valor_total, stats.previous.valor_total)}
        />
        <StatCard
          title="Recebido"
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          value={formatCurrency(stats.current.valor_liquidado)}
          change={getPercentageChange(stats.current.valor_liquidado, stats.previous.valor_liquidado)}
        />
        <StatCard
          title="Clientes"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={String(stats.current.clientes_atendidos)}
          change={getPercentageChange(stats.current.clientes_atendidos, stats.previous.clientes_atendidos)}
        />
      </div>

      {/* ========== META DE LUCRO + RESUMO FINANCEIRO ========== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Meta de Lucro */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Meta de Lucro</CardTitle>
              <CardDescription>
                {meta ? `Meta: ${formatCurrency(meta.valor_meta)}` : 'Nenhuma meta definida'}
              </CardDescription>
            </div>
            <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Target className="h-4 w-4" />
                  {meta ? 'Editar' : 'Definir'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Meta de Lucro - {getMonthLabel(mes)}</DialogTitle>
                  <DialogDescription>
                    Defina a meta de lucro para este mes. O lucro e calculado como receita total menos despesas pagas.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="meta-valor" className="text-sm font-medium text-foreground">
                      Valor da Meta (R$)
                    </label>
                    <Input
                      id="meta-valor"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 15000.00"
                      value={metaValue}
                      onChange={e => setMetaValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="meta-obs" className="text-sm font-medium text-foreground">
                      Observações (opcional)
                    </label>
                    <Input
                      id="meta-obs"
                      placeholder="Ex: Objetivo trimestral..."
                      value={metaObs}
                      onChange={e => setMetaObs(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMetaDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveMeta} disabled={savingMeta}>
                    {savingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Salvar Meta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {meta ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className={`font-semibold ${metaAtingida ? 'text-emerald-600' : 'text-foreground'}`}>
                      {metaPercent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={metaPercent}
                    className="h-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Lucro Atual</p>
                    <p className={`text-lg font-bold ${resumo.lucro_atual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(resumo.lucro_atual)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Falta</p>
                    <p className="text-lg font-bold text-foreground">
                      {metaAtingida ? 'Meta atingida!' : formatCurrency(meta.valor_meta - resumo.lucro_atual)}
                    </p>
                  </div>
                </div>
                {meta.observacoes && (
                  <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                    {meta.observacoes}
                  </p>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Defina uma meta para acompanhar o progresso do lucro mensal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
            <CardDescription>Composicao de receitas e despesas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">OS Recebidas</span>
                <span className="font-medium text-foreground">{formatCurrency(resumo.os_recebido)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Parcelas Contratos</span>
                <span className="font-medium text-foreground">{formatCurrency(resumo.parcelas_recebidas)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Receitas Avulsas</span>
                <span className="font-medium text-foreground">{formatCurrency(resumo.receitas_avulsas)}</span>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-emerald-600">Total Receita</span>
                <span className="text-emerald-600">{formatCurrency(resumo.receita_total)}</span>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Despesas Pagas</span>
                <span className="font-medium text-red-600">{formatCurrency(resumo.despesas_pagas)}</span>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className={resumo.lucro_atual >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  Lucro Liquido
                </span>
                <span className={resumo.lucro_atual >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCurrency(resumo.lucro_atual)}
                </span>
              </div>
            </div>
            {(resumo.receitas_pendentes > 0 || resumo.despesas_pendentes > 0) && (
              <div className="border-t border-border pt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Pendentes</p>
                {resumo.receitas_pendentes > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">A Receber</span>
                    <span className="text-amber-600">{formatCurrency(resumo.receitas_pendentes)}</span>
                  </div>
                )}
                {resumo.despesas_pendentes > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">A Pagar</span>
                    <span className="text-amber-600">{formatCurrency(resumo.despesas_pendentes)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== SERVICOS POR TIPO / TOP CLIENTES ========== */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servicos por Tipo</CardTitle>
            <CardDescription>Distribuicao dos servicos concluidos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.servicos_por_tipo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum servico concluido neste mes.</p>
            ) : (
              <div className="space-y-3">
                {data.servicos_por_tipo.map((s) => (
                  <div key={s.tipo_servico} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.tipo_servico}</span>
                      <span className="text-xs text-muted-foreground">({s.quantidade}x)</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(s.valor_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Clientes</CardTitle>
            <CardDescription>Maiores geradores de receita</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top_clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente neste mes.</p>
            ) : (
              <div className="space-y-3">
                {data.top_clientes.map((c, i) => (
                  <div key={c.razao_social} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">{c.razao_social}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(c.valor_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== ABAS: ORDENS / CONTRATOS / LANCAMENTOS ========== */}
      <Tabs defaultValue="ordens" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ordens">
            Ordens ({data.ordens.length})
          </TabsTrigger>
          <TabsTrigger value="contratos">
            Contratos ({data.contratos.length})
          </TabsTrigger>
          <TabsTrigger value="parcelas">
            Parcelas ({data.parcelas.length})
          </TabsTrigger>
          <TabsTrigger value="lancamentos">
            Lancamentos ({data.lancamentos.length})
          </TabsTrigger>
        </TabsList>

        {/* -- Ordens -- */}
        <TabsContent value="ordens">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ordens de Servico</CardTitle>
              <CardDescription>Todas as ordens do mes</CardDescription>
            </CardHeader>
            <CardContent>
              {data.ordens.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ordem neste mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N. OS</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Liquidado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ordens.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">{o.numero_os}</TableCell>
                          <TableCell>{o.razao_social}</TableCell>
                          <TableCell>{o.tipo_servico}</TableCell>
                          <TableCell>{formatDateBR(o.data_execucao)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(o.valor)}</TableCell>
                          <TableCell><StatusBadge status={o.status} /></TableCell>
                          <TableCell>
                            {o.liquidado ? (
                              <span className="text-xs text-emerald-600 font-medium">
                                {formatCurrency(o.valor_pago)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Contratos -- */}
        <TabsContent value="contratos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratos Ativos</CardTitle>
              <CardDescription>Contratos vigentes no periodo</CardDescription>
            </CardHeader>
            <CardContent>
              {data.contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contrato vigente neste mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N. Contrato</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Recebido no Mes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.contratos.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                          <TableCell>{c.razao_social}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.valor_total)}</TableCell>
                          <TableCell>{c.parcelas_pagas}/{c.numero_parcelas}</TableCell>
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                          <TableCell className="text-right">{formatCurrency(c.valor_recebido_mes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Parcelas -- */}
        <TabsContent value="parcelas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcelas do Mes</CardTitle>
              <CardDescription>Parcelas com vencimento neste mes</CardDescription>
            </CardHeader>
            <CardContent>
              {data.parcelas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma parcela neste mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.parcelas.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.numero_contrato}</TableCell>
                          <TableCell>{p.razao_social}</TableCell>
                          <TableCell>{p.numero_parcela}</TableCell>
                          <TableCell>{formatDateBR(p.data_vencimento)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.valor_parcela)}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell className="text-right">
                            {p.valor_pago ? formatCurrency(p.valor_pago) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Lancamentos -- */}
        <TabsContent value="lancamentos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despesas e Receitas Avulsas</CardTitle>
              <CardDescription>Lancamentos financeiros do mes</CardDescription>
            </CardHeader>
            <CardContent>
              {data.lancamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lancamento neste mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lancamentos.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              l.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                          </TableCell>
                          <TableCell>{l.descricao}</TableCell>
                          <TableCell>
                            {l.categoria_nome ? (
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: l.categoria_cor || '#6b7280' }}
                                />
                                {l.categoria_nome}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{formatDateBR(l.data_lancamento)}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            l.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {l.tipo === 'despesa' ? '- ' : ''}{formatCurrency(l.valor)}
                          </TableCell>
                          <TableCell><StatusBadge status={l.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================
// COMPONENTE STAT CARD
// =============================================
function StatCard({
  title,
  icon,
  value,
  change
}: {
  title: string
  icon: React.ReactNode
  value: string
  change: number
}) {
  const isPositive = change > 0
  const isZero = change === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {isZero ? (
            <Minus className="h-3 w-3 text-muted-foreground" />
          ) : isPositive ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${
            isZero ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {isZero ? '0%' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}
          </span>
          <span className="text-xs text-muted-foreground">vs mes anterior</span>
        </div>
      </CardContent>
    </Card>
  )
}
