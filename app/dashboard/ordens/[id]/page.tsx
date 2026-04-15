'use client'

import type { OrdemServico } from "@/lib/types"
import { generateOrderPDF } from '@/lib/pdf-os'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'
import { ArrowLeft, Edit, Eye, FileText, Printer, Shield, Users, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { formatDateBRFromYYYYMMDD, parseDateFromYYYYMMDD } from '@/lib/utils'
import { toast } from 'sonner'

export default function OrdemDetalhesPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [ordem, setOrdem] = useState<OrdemServico | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchOrdem()
  }, [id])

  const fetchOrdem = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ordens/${id}`)
      if (response.ok) {
        const data = await response.json()
        setOrdem(data)
      } else {
        router.push('/dashboard/ordens')
      }
    } catch (error) {
      console.error(error)
      router.push('/dashboard/ordens')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
      em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
      concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-800' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
    }
    return statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  const handleStatusChange = async (novoStatus: string) => {
    if (!ordem || novoStatus === ordem.status) return
    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/ordens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (response.ok) {
        setOrdem(prev => prev ? { ...prev, status: novoStatus as OrdemServico['status'] } : prev)
        toast.success('Status atualizado com sucesso!')
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

const handlePrint = async () => {
  try {
    if (!ordem) return

    await generateOrderPDF(ordem) // já abre a janela e imprime
    toast.success('OS enviada para impressão!')
  } catch (error) {
    console.error(error)
    toast.error('Erro ao imprimir PDF')
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!ordem) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Ordem de serviço não encontrada</p>
      </div>
    )
  }

  const actionItems = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => setViewMode('view')
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => router.push(`/dashboard/ordens/${id}/edit`)
    },
    {
      label: 'Gerar Certificado',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => router.push(`/dashboard/certificados/novo?ordem_id=${id}`)
    },
    {
      label: 'Imprimir',
      icon: <Printer className="h-4 w-4" />,
      onClick: handlePrint
    }
  ]

  const statusOptions = [
    { value: 'pendente', label: 'Pendente', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'concluida', label: 'Concluída', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-300' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/ordens">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Ordem de Serviço</h1>
            <p className="text-muted-foreground">OS {ordem.numero_os}</p>
          </div>
        </div>

        <ActionMenu items={actionItems}>
          <MoreHorizontal className="h-4 w-4" />
        </ActionMenu>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da OS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* STATUS COM TROCA RÁPIDA */}
            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={updatingStatus}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
                      ${ordem.status === opt.value
                        ? opt.color + ' ring-2 ring-offset-1 ring-current scale-105 shadow'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                      } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p><b>Cliente:</b> {ordem.cliente?.razao_social}</p>
            <p><b>Data:</b> {formatDateBRFromYYYYMMDD(ordem.data_execucao)}</p>
            <p><b>Tipo:</b> {ordem.tipo_servico}</p>
            {ordem.descricao_servico && <p><b>Descrição:</b> {ordem.descricao_servico}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">
                {ordem.valor ? formatCurrency(ordem.valor) : 'Não informado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordem.garantia_meses ? (
                <p>{ordem.garantia_meses} meses</p>
              ) : (
                <p>Sem garantia</p>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{ordem.visitas_gratuitas} visitas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}