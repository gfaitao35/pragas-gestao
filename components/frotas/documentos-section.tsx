'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createDocumentoAction, deleteDocumentoAction } from '@/app/dashboard/frotas/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, FileImage, File, Trash2, Download, Loader2, Upload, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { VeiculoDocumento } from '@/lib/types'

interface DocumentosSectionProps {
  veiculoId: string
  documentos: VeiculoDocumento[]
}

export function DocumentosSection({ veiculoId, documentos }: DocumentosSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState<VeiculoDocumento | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo')
      return
    }

    setLoading(true)

    try {
      for (const file of files) {
        // Upload para Vercel Blob
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file,
        })

        if (!response.ok) {
          throw new Error('Falha no upload')
        }

        const { url } = await response.json()

        // Salvar referência no banco
        const result = await createDocumentoAction({
          veiculo_id: veiculoId,
          nome: file.name,
          tipo: file.type.startsWith('image/') ? 'imagem' : 'documento',
          url,
          tamanho: file.size,
        })

        if (result?.error) {
          throw new Error(result.error)
        }
      }

      toast.success(`${files.length} arquivo(s) enviado(s) com sucesso`)
      setFiles([])
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Erro ao enviar arquivos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return
    
    const result = await deleteDocumentoAction(deletingDoc.id, veiculoId)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    
    toast.success('Documento excluído com sucesso')
    setDeletingDoc(null)
    router.refresh()
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = (tipo: string) => tipo === 'imagem' || tipo.startsWith('image/')

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Documentos e Fotos</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Documentos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Arquivos</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={loading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste arquivos
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Imagens, PDFs ou documentos
                      </p>
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <Label>Arquivos selecionados</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2 min-w-0">
                            {file.type.startsWith('image/') ? (
                              <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <File className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => removeFile(index)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={loading || files.length === 0}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar {files.length > 0 && `(${files.length})`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {documentos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative border rounded-lg overflow-hidden bg-muted/50"
                >
                  {isImage(doc.tipo) ? (
                    <div className="aspect-square relative">
                      <img
                        src={doc.url}
                        alt={doc.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center">
                      <File className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.tamanho)}</p>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button size="icon" variant="secondary" asChild>
                      <a href={doc.url} download={doc.nome}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      size="icon" 
                      variant="destructive"
                      onClick={() => setDeletingDoc(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileImage className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum documento</h3>
              <p className="text-sm text-muted-foreground">
                Adicione fotos e documentos do veículo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento <strong>{deletingDoc?.nome}</strong>?
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
