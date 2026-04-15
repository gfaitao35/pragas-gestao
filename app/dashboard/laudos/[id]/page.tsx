'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Printer, Save, Trash2, X, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateLaudoPDF } from '@/lib/pdf-laudo'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'

export default function LaudoDetalhesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [laudo, setLaudo] = useState<any>(null)
  const [texto, setTexto] = useState('')
  const [imagens, setImagens] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editando, setEditando] = useState(false)

  useEffect(() => { fetchLaudo() }, [params.id])

  const fetchLaudo = async () => {
    try {
      const res = await fetch(`/api/laudos/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setLaudo(data)
        setTexto(data.texto)
        setImagens(data.imagens || [])
      } else {
        router.push('/dashboard/laudos')
      }
    } catch { router.push('/dashboard/laudos') }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/laudos/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, imagens }),
      })
      if (res.ok) {
        toast.success('Laudo atualizado!')
        setEditando(false)
        setLaudo((prev: any) => ({ ...prev, texto, imagens }))
      } else {
        toast.error('Erro ao salvar')
      }
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleUploadImages = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/uploads', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          setImagens(prev => [...prev, url])
          setEditando(true)
        } else {
          toast.error(`Erro ao enviar ${file.name}`)
        }
      }
    } catch { toast.error('Erro no upload') }
    finally { setUploading(false) }
  }

  const handleRemoveImagem = (idx: number) => {
    setImagens(prev => prev.filter((_, i) => i !== idx))
    setEditando(true)
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este laudo?')) return
    try {
      const res = await fetch(`/api/laudos/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Laudo excluído')
        router.push('/dashboard/laudos')
      } else {
        toast.error('Erro ao excluir')
      }
    } catch { toast.error('Erro ao excluir') }
  }

  const handlePrint = async () => {
    try {
      await generateLaudoPDF({ ...laudo, texto, imagens })
    } catch { toast.error('Erro ao gerar PDF') }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  if (!laudo) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/laudos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Laudo Técnico</h1>
            <p className="text-muted-foreground">{laudo.numero_laudo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editando && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* DADOS DA OS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium">OS Referência</p>
            <Badge variant="outline">{laudo.numero_os}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Tipo de Serviço</p>
            <p className="font-semibold">{laudo.tipo_servico}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Data de Execução</p>
            <p className="font-semibold">{laudo.data_execucao ? formatDateBRFromYYYYMMDD(laudo.data_execucao) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Cliente</p>
            <p className="font-semibold">{laudo.cliente_nome}</p>
          </div>
        </CardContent>
      </Card>

      {/* TEXTO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Texto do Laudo</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={texto}
            onChange={e => { setTexto(e.target.value); setEditando(true) }}
            className="min-h-[360px] font-mono text-sm leading-relaxed resize-y"
          />
        </CardContent>
      </Card>

      {/* FOTOS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Fotos do Serviço ({imagens.length})</CardTitle>
            <Button
              variant="outline" size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Adicionar fotos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleUploadImages(e.target.files)}
          />

          {imagens.length === 0 ? (
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Clique para adicionar fotos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {imagens.map((url, idx) => (
                <div key={idx} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => handleRemoveImagem(idx)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </div>
                </div>
              ))}
              {uploading && (
                <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editando && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setTexto(laudo.texto); setImagens(laudo.imagens); setEditando(false) }}>
            Descartar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  )
}
