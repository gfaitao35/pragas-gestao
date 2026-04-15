'use client'

import { generateCertificatePDF } from '@/lib/pdf-generator'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'
import { ArrowLeft, Edit, Eye, FileText, Download, Printer, Shield, Calendar } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDateBRFromYYYYMMDD, parseDateFromYYYYMMDD, startOfDay } from '@/lib/utils'

interface Certificado {
  id: string
  numero_certificado: string
  ordem_servico_id: string
  ordem_servico?: {
    numero_os: string
    cliente?: {
      razao_social: string
      nome_fantasia: string | null
    }
    tipo_servico: string
    data_execucao: string
  }
  data_emissao: string
  data_validade: string
  tipo_certificado: string
  observacoes: string | null
  created_at: string
}

export default function CertificadoDetalhesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [certificado, setCertificado] = useState<Certificado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCertificado()
  }, [id])

  const fetchCertificado = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificados/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCertificado(data)
      } else {
        router.push('/dashboard/certificados')
      }
    } catch (error) {
      console.error('Erro ao buscar certificado:', error)
      router.push('/dashboard/certificados')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/certificados/${id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CERT-${certificado?.numero_certificado}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF baixado com sucesso!')
      } else {
        toast.error('Erro ao baixar PDF')
      }
    } catch (error) {
      toast.error('Erro ao baixar PDF')
    }
  }

  const getStatusBadge = (dataValidade: string) => {
    const hoje = startOfDay(new Date())
    const validade = parseDateFromYYYYMMDD(dataValidade) || new Date(0)
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diasRestantes < 0) {
      return { label: 'Expirado', className: 'bg-red-100 text-red-800' }
    } else if (diasRestantes <= 30) {
      return { label: 'Expirando em breve', className: 'bg-amber-100 text-amber-800' }
    } else {
      return { label: 'Válido', className: 'bg-emerald-100 text-emerald-800' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!certificado) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Certificado não encontrado</p>
      </div>
    )
  }

  const statusBadge = getStatusBadge(certificado.data_validade)
  const actionItems = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => {}
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => router.push(`/dashboard/certificados/${id}/edit`)
    },
    {
      label: 'Baixar PDF',
      icon: <Download className="h-4 w-4" />,
      onClick: handleDownloadPDF
    },
    {
      label: 'Imprimir',
      icon: <Printer className="h-4 w-4" />,
      onClick: handlePrint
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/certificados">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certificado</h1>
            <p className="text-muted-foreground">Certificado {certificado.numero_certificado}</p>
          </div>
        </div>
        
        <ActionMenu items={actionItems}>
          <FileText className="h-4 w-4" />
        </ActionMenu>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações Principais */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações do Certificado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número do Certificado</p>
                <p className="font-semibold">{certificado.numero_certificado}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de Certificado</p>
                <p className="font-semibold">{certificado.tipo_certificado}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data de Emissão</p>
                <p className="font-semibold">
                  {formatDateBRFromYYYYMMDD(certificado.data_emissao)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data de Validade</p>
                <div className="space-y-1">
                  <p className="font-semibold">
                    {formatDateBRFromYYYYMMDD(certificado.data_validade)}
                  </p>
                  <Badge className={statusBadge.className}>
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">OS Relacionada</p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{certificado.ordem_servico?.numero_os}</p>
                <p className="text-sm text-muted-foreground">
                  {certificado.ordem_servico?.cliente?.razao_social}
                  {certificado.ordem_servico?.cliente?.nome_fantasia && 
                    ` (${certificado.ordem_servico.cliente.nome_fantasia})`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Serviço: {certificado.ordem_servico?.tipo_servico}
                </p>
                <p className="text-sm text-muted-foreground">
                  Execução: {certificado.ordem_servico?.data_execucao && 
                    formatDateBRFromYYYYMMDD(certificado.ordem_servico.data_execucao)
                  }
                </p>
              </div>
            </div>

            {certificado.observacoes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Observações</p>
                <p className="text-sm whitespace-pre-line">{certificado.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto text-primary mb-2" />
                <Badge className={statusBadge.className + " text-sm px-3 py-1"}>
                  {statusBadge.label}
                </Badge>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Válido por</p>
                <p className="text-lg font-semibold text-primary">
                  {Math.ceil(
                    ((parseDateFromYYYYMMDD(certificado.data_validade) || new Date(0)).getTime() - startOfDay(new Date()).getTime()) / 
                    (1000 * 60 * 60 * 24)
                  )} dias
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleDownloadPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Link href={`/dashboard/certificados/${id}/edit`}>
                <Button className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
