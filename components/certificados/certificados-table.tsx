'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCertificadoAction } from '@/app/dashboard/certificados/actions'
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
import { MoreHorizontal, Trash2, Search, Award, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { generateCertificatePDF } from '@/lib/pdf-generator'
import type { Certificado } from '@/lib/types'
import { formatDateBRFromYYYYMMDD, parseDateFromYYYYMMDD, startOfDay } from '@/lib/utils'

interface CertificadosTableProps {
  certificados: Certificado[]
}

export function CertificadosTable({ certificados }: CertificadosTableProps) {
  const [search, setSearch] = useState('')
  const [deletingCertificado, setDeletingCertificado] = useState<Certificado | null>(null)
  const router = useRouter()

const filteredCertificados = certificados.filter((cert) => {
  const ordem = cert.ordem_servico as {
    numero_os: string
    cliente?: { razao_social?: string; cnpj?: string }
  } | undefined

  const termo = search.toLowerCase()

  return (
    cert.numero_certificado.toLowerCase().includes(termo) ||
    cert.tipo_certificado.toLowerCase().includes(termo) ||
    ordem?.numero_os?.toLowerCase().includes(termo) ||
    ordem?.cliente?.razao_social?.toLowerCase().includes(termo) ||
    ordem?.cliente?.cnpj?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
  )
})

  const handleDelete = async () => {
    if (!deletingCertificado) return
    const result = await deleteCertificadoAction(deletingCertificado.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Certificado excluído com sucesso')
    setDeletingCertificado(null)
    router.refresh()
    if (!deletingCertificado?.id) {
    toast.error('ID do certificado inválido')
    return
  }
  }

const handleDownloadPDF = async (certificado: Certificado) => {
  try {
    console.log(certificado) // DEBUG

    await generateCertificatePDF(certificado)
    toast.success('PDF gerado com sucesso')
  } catch (err) {
    console.error(err)
    toast.error('Erro ao gerar PDF')
  }
}


  const isExpired = (dataValidade: string) => {
    return (parseDateFromYYYYMMDD(dataValidade) || new Date(0)) < startOfDay(new Date())
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, empresa, CNPJ, tipo ou OS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredCertificados.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Ordem de Serviço</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificados.map((cert) => {
                    const expired = isExpired(cert.data_validade)

                    const ordem = cert.ordem_servico as {
                      numero_os: string
                      cliente?: { razao_social?: string; cnpj?: string }
                    }

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium font-mono">
                          {cert.numero_certificado}
                        </TableCell>

                        {/* EMPRESA */}
                        <TableCell>
                          {ordem?.cliente?.razao_social || '-'}
                        </TableCell>

                        {/* CNPJ */}
                        <TableCell>
                          {ordem?.cliente?.cnpj || '-'}
                        </TableCell>

                        {/* ORDEM DE SERVIÇO */}
                        <TableCell>
                          {ordem?.numero_os || '-'}
                        </TableCell>

                        <TableCell>{cert.tipo_certificado}</TableCell>

                        <TableCell>
                          {formatDateBRFromYYYYMMDD(cert.data_emissao)}
                        </TableCell>

                        <TableCell>
                          {formatDateBRFromYYYYMMDD(cert.data_validade)}
                        </TableCell>

                        <TableCell>
                          <Badge variant={expired ? 'destructive' : 'default'}>
                            {expired ? 'Vencido' : 'Válido'}
                          </Badge>
                        </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">

                                <DropdownMenuItem onClick={() => handleDownloadPDF(cert)}>
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Imprimir PDF
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setDeletingCertificado(cert)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>

                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Award className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum certificado encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente buscar por outro termo'
                  : 'Os certificados serão listados aqui após a emissão'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingCertificado} onOpenChange={() => setDeletingCertificado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o certificado{' '}
              <strong>{deletingCertificado?.numero_certificado}</strong>? Esta ação não pode ser desfeita.
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
