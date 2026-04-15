'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText,
  ClipboardList, Award, Upload, Trash2, Download, Loader2,
  ExternalLink, Eye, FileImage, FileVideo, File, ClipboardCheck, X, ZoomIn
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'

interface ClientePerfil {
  cliente: any
  ordens: any[]
  certificados: any[]
  laudos: any[]
  documentos: any[]
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_andamento: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

function getFileIcon(tipo: string) {
  if (tipo.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />
  if (tipo.startsWith('video/')) return <FileVideo className="h-5 w-5 text-purple-500" />
  if (tipo === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />
  return <File className="h-5 w-5 text-gray-500" />
}

function formatBytes(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClientePerfilPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<ClientePerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nome: string; tipo: string } | null>(null)

  useEffect(() => { fetchPerfil() }, [params.id])

  const fetchPerfil = async () => {
    try {
      const res = await fetch(`/api/clientes/${params.id}`)
      if (!res.ok) { router.push('/dashboard/clientes'); return }
      setData(await res.json())
    } catch { router.push('/dashboard/clientes') }
    finally { setLoading(false) }
  }

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Upload do arquivo
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/uploads', { method: 'POST', body: formData })
        if (!uploadRes.ok) { toast.error(`Erro ao enviar ${file.name}`); continue }
        const { url } = await uploadRes.json()

        // Salvar referência no banco
        const docRes = await fetch(`/api/clientes/${params.id}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: file.name, tipo: file.type, url, tamanho: file.size }),
        })
        if (docRes.ok) {
          toast.success(`${file.name} enviado!`)
        } else {
          toast.error(`Erro ao salvar ${file.name}`)
        }
      }
      await fetchPerfil()
    } catch { toast.error('Erro no upload') }
    finally { setUploading(false) }
  }

  const handleDeleteDoc = async (docId: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return
    setDeletingDocId(docId)
    try {
      const res = await fetch(`/api/clientes/${params.id}/documentos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      })
      if (res.ok) {
        toast.success('Documento excluído')
        setData(prev => prev ? { ...prev, documentos: prev.documentos.filter(d => d.id !== docId) } : prev)
      } else {
        toast.error('Erro ao excluir')
      }
    } catch { toast.error('Erro ao excluir') }
    finally { setDeletingDocId(null) }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  if (!data) return null

  const { cliente, ordens, certificados, laudos, documentos } = data

  const formatDoc = () => {
    if (cliente.tipo_pessoa === 'fisica') {
      const cpf = (cliente.cpf || '').replace(/\D/g, '')
      return cpf.length === 11 ? cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : cliente.cpf
    }
    const cnpj = (cliente.cnpj || '').replace(/\D/g, '')
    return cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : cliente.cnpj
  }

  const enderecoCompleto = [cliente.endereco, cliente.cidade, cliente.estado].filter(Boolean).join(', ')
  const totalGasto = ordens.reduce((acc: number, o: any) => acc + (o.valor || 0), 0)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clientes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{cliente.razao_social}</h1>
          {cliente.nome_fantasia && (
            <p className="text-muted-foreground">{cliente.nome_fantasia}</p>
          )}
        </div>
        <Badge variant={cliente.ativo ? 'default' : 'secondary'}>
          {cliente.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
        <Badge variant="outline">
          {cliente.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
        </Badge>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{ordens.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Ordens de Serviço</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{certificados.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Certificados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{laudos.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Laudos Técnicos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total em Serviços</div>
          </CardContent>
        </Card>
      </div>

      {/* ABAS */}
      <Tabs defaultValue="info">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="info">
            <User className="mr-1.5 h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="ordens">
            <ClipboardList className="mr-1.5 h-4 w-4" />
            OS ({ordens.length})
          </TabsTrigger>
          <TabsTrigger value="certificados">
            <Award className="mr-1.5 h-4 w-4" />
            Certificados ({certificados.length})
          </TabsTrigger>
          <TabsTrigger value="laudos">
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            Laudos ({laudos.length})
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText className="mr-1.5 h-4 w-4" />
            Arquivos ({documentos.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA: DADOS */}
        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Informações do Cliente</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    {cliente.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}
                  </p>
                  <p className="font-mono">{formatDoc() || '-'}</p>
                </div>
                {cliente.tipo_pessoa === 'juridica' && cliente.nome_fantasia && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Nome Fantasia</p>
                    <p>{cliente.nome_fantasia}</p>
                  </div>
                )}
                {cliente.contato_responsavel && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contato Responsável</p>
                    <p>{cliente.contato_responsavel}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Cliente desde</p>
                  <p>{cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                {cliente.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.telefone}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.email}</span>
                  </div>
                )}
                {enderecoCompleto && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{enderecoCompleto}{cliente.cep ? ` - CEP: ${cliente.cep}` : ''}</span>
                  </div>
                )}
                {cliente.observacoes && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Observações</p>
                    <p className="text-sm">{cliente.observacoes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: ORDENS DE SERVIÇO */}
        <TabsContent value="ordens">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ordens de Serviço</CardTitle>
                <Link href={`/dashboard/ordens?cliente=${params.id}`}>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {ordens.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma ordem de serviço encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ordens.map((os: any) => (
                    <div key={os.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <ClipboardList className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{os.numero_os}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[os.status] || ''}`} variant="outline">
                              {STATUS_LABELS[os.status] || os.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {os.tipo_servico} · {os.data_execucao ? formatDateBRFromYYYYMMDD(os.data_execucao) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {os.valor && (
                          <span className="text-sm font-medium">
                            {os.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                        <Link href={`/dashboard/ordens/${os.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: CERTIFICADOS */}
        <TabsContent value="certificados">
          <Card>
            <CardHeader><CardTitle>Certificados Emitidos</CardTitle></CardHeader>
            <CardContent>
              {certificados.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum certificado emitido para este cliente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificados.map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                          <Award className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{cert.numero_certificado}</span>
                          <p className="text-xs text-muted-foreground">
                            {cert.tipo_certificado} · OS: {cert.numero_os}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Emissão: {cert.data_emissao ? formatDateBRFromYYYYMMDD(cert.data_emissao) : '-'} ·
                            Validade: {cert.data_validade ? formatDateBRFromYYYYMMDD(cert.data_validade) : '-'}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/certificados/${cert.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: LAUDOS */}
        <TabsContent value="laudos">
          <Card>
            <CardHeader><CardTitle>Laudos Técnicos</CardTitle></CardHeader>
            <CardContent>
              {laudos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum laudo emitido para este cliente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {laudos.map((laudo: any) => (
                    <div key={laudo.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                          <ClipboardCheck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{laudo.numero_laudo}</span>
                          <p className="text-xs text-muted-foreground">
                            {laudo.tipo_servico} · OS: {laudo.numero_os}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {laudo.data_execucao ? formatDateBRFromYYYYMMDD(laudo.data_execucao) : '-'}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/laudos/${laudo.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: DOCUMENTOS */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Arquivos do Cliente</CardTitle>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Upload className="mr-2 h-4 w-4" />
                  }
                  Enviar Arquivo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={e => e.target.files && handleUpload(e.target.files)}
              />

              {/* DROP ZONE */}
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center mb-4 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Imagens, Vídeos, Word, Excel
                </p>
              </div>

              {documentos.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum arquivo enviado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(doc.tamanho)} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(doc.tipo === 'application/pdf' || doc.tipo.startsWith('image/')) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewDoc({ url: doc.url, nome: doc.nome, tipo: doc.tipo })}
                            title="Pré-visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Baixar">
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDoc(doc.id, doc.nome)}
                          disabled={deletingDocId === doc.id}
                        >
                          {deletingDocId === doc.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative bg-background rounded-xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-4xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(previewDoc.tipo)}
                <span className="text-sm font-medium truncate">{previewDoc.nome}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <Download className="mr-1.5 h-4 w-4" />
                    Baixar
                  </Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto bg-muted/30">
              {previewDoc.tipo === 'application/pdf' ? (
                <object
                  data={previewDoc.url + '#toolbar=1&navpanes=1&scrollbar=1&view=FitH'}
                  type="application/pdf"
                  className="w-full min-h-[75vh]"
                >
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-30" />
                    <p className="text-sm">Seu browser não suporta pré-visualização de PDF.</p>
                    <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar para visualizar
                      </Button>
                    </a>
                  </div>
                </object>
              ) : previewDoc.tipo.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 min-h-[50vh]">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.nome}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}