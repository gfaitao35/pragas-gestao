'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, FileText, Eye, Trash2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { generateLaudoPDF } from '@/lib/pdf-laudo'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'
import { ModuleLock } from '@/components/module-lock'

interface Laudo {
  id: string
  numero_laudo: string
  numero_os: string
  tipo_servico: string
  data_execucao: string
  cliente_nome: string
  created_at: string
}

export default function LaudosPage() {
  const router = useRouter()
  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchLaudos() }, [])

  const fetchLaudos = async () => {
    try {
      const res = await fetch('/api/laudos')
      if (res.ok) setLaudos(await res.json())
    } catch { toast.error('Erro ao carregar laudos') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este laudo?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/laudos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLaudos(prev => prev.filter(l => l.id !== id))
        toast.success('Laudo excluído')
      } else {
        toast.error('Erro ao excluir')
      }
    } catch { toast.error('Erro ao excluir') }
    finally { setDeletingId(null) }
  }

  const handlePrint = async (id: string) => {
    try {
      const res = await fetch(`/api/laudos/${id}`)
      if (!res.ok) { toast.error('Erro ao carregar laudo'); return }
      const laudo = await res.json()
      await generateLaudoPDF(laudo)
    } catch { toast.error('Erro ao gerar PDF') }
  }

  const laudosFiltrados = laudos.filter(l =>
    l.numero_laudo.toLowerCase().includes(busca.toLowerCase()) ||
    l.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    l.numero_os?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <ModuleLock modulo="laudos" nomeModulo="Laudos Técnicos">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laudos Técnicos</h1>
          <p className="text-muted-foreground">Gerencie os laudos técnicos emitidos</p>
        </div>
        <Link href="/dashboard/laudos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Laudo
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, cliente ou OS..."
          className="pl-9"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : laudosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {busca ? 'Nenhum laudo encontrado para esta busca' : 'Nenhum laudo emitido ainda'}
            </p>
            {!busca && (
              <Link href="/dashboard/laudos/novo" className="mt-4">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro laudo
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {laudosFiltrados.map(laudo => (
            <Card key={laudo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{laudo.numero_laudo}</span>
                        <Badge variant="outline" className="text-xs">OS: {laudo.numero_os}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{laudo.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {laudo.tipo_servico} · {laudo.data_execucao ? formatDateBRFromYYYYMMDD(laudo.data_execucao) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handlePrint(laudo.id)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Link href={`/dashboard/laudos/${laudo.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline" size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(laudo.id)}
                      disabled={deletingId === laudo.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </ModuleLock>
  )
}