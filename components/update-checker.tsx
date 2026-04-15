'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2, Rocket } from 'lucide-react'
import { toast } from 'sonner'

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'done' | 'error'

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl?: string
  releaseNotes?: string
  error?: string
  noAsset?: boolean
}

interface Progress {
  stage: 'download' | 'extract' | 'install'
  percent: number
}

const stageLabel: Record<string, string> = {
  download: 'Baixando atualização',
  extract: 'Extraindo arquivos',
  install: 'Instalando',
}

export function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronUpdater

  useEffect(() => {
    if (!isElectron) return
    // Escuta progresso do main process
    const cleanup = (window as any).electronUpdater.onProgress((data: Progress) => {
      setProgress(data)
    })
    return cleanup
  }, [isElectron])

  const handleCheck = async () => {
    if (!isElectron) {
      toast.info('Atualização disponível apenas no app desktop')
      return
    }
    setStatus('checking')
    setInfo(null)
    setProgress(null)

    try {
      const result: UpdateInfo = await (window as any).electronUpdater.check()

      if (result.error) {
        setStatus('error')
        setInfo(result)
        toast.error('Erro ao verificar: ' + result.error)
        return
      }

      if (result.noAsset) {
        setStatus('error')
        toast.error('Release encontrado mas sem arquivo update.zip')
        return
      }

      setInfo(result)
      setStatus(result.hasUpdate ? 'available' : 'up-to-date')

      if (!result.hasUpdate) {
        toast.success('Você já está na versão mais recente!')
      }
    } catch (err) {
      setStatus('error')
      toast.error('Erro ao verificar atualizações')
    }
  }

  const handleInstall = async () => {
    if (!info?.downloadUrl) return
    setStatus('downloading')
    setProgress({ stage: 'download', percent: 0 })

    try {
      const result = await (window as any).electronUpdater.install(info.downloadUrl)

      if (result.error) {
        setStatus('error')
        toast.error('Erro ao instalar: ' + result.error)
        return
      }

      setStatus('done')
      toast.success('Atualização instalada! Reinicie para aplicar.')
    } catch (err) {
      setStatus('error')
      toast.error('Erro durante a instalação')
    }
  }

  const handleRestart = async () => {
    await (window as any).electronUpdater.restart()
  }

  if (!isElectron) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Atualizações do Sistema
        </CardTitle>
        <CardDescription>
          Verifique se há uma nova versão disponível
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Versão atual</p>
            <Badge variant="outline" className="font-mono">
              v{(window as any).electronUpdater ? (info?.currentVersion ?? '...') : '—'}
            </Badge>
          </div>

          {info?.hasUpdate && (
            <div className="space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Nova versão</p>
              <Badge className="bg-emerald-100 text-emerald-800 font-mono">
                {info.latestVersion}
              </Badge>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {(status === 'downloading') && progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stageLabel[progress.stage]}...</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Release notes */}
        {info?.hasUpdate && info.releaseNotes && status === 'available' && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground max-h-32 overflow-y-auto">
            <p className="font-medium text-foreground mb-1">O que há de novo:</p>
            <p className="whitespace-pre-wrap">{info.releaseNotes}</p>
          </div>
        )}

        {/* Mensagens de estado */}
        {status === 'up-to-date' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Você já está na versão mais recente
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {info?.error ?? 'Erro ao verificar atualizações'}
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Atualização instalada com sucesso!
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2">
          {status !== 'downloading' && status !== 'done' && (
            <Button
              variant="outline"
              onClick={handleCheck}
              disabled={status === 'checking'}
            >
              {status === 'checking' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {status === 'checking' ? 'Verificando...' : 'Verificar atualizações'}
            </Button>
          )}

          {status === 'available' && (
            <Button onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" />
              Instalar v{info?.latestVersion}
            </Button>
          )}

          {status === 'done' && (
            <Button onClick={handleRestart}>
              <Rocket className="mr-2 h-4 w-4" />
              Reiniciar agora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
