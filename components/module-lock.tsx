'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface ModuleLockProps {
  modulo: string
  nomeModulo: string
  children: React.ReactNode
}

export function ModuleLock({ modulo, nomeModulo, children }: ModuleLockProps) {
  const [liberado, setLiberado] = useState<boolean | null>(null) // null = carregando
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkModulo()
  }, [modulo])

  const checkModulo = async () => {
    try {
      const res = await fetch('/api/modulos')
      if (res.ok) {
        const { modulos_liberados } = await res.json()
        setLiberado(modulos_liberados.includes(modulo))
      } else {
        setLiberado(false)
      }
    } catch {
      setLiberado(false)
    }
  }

  const handleLiberar = async () => {
    if (!token.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/modulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo, token: token.trim() }),
      })
      if (res.ok) {
        toast.success('Módulo liberado com sucesso!')
        setLiberado(true)
      } else {
        const data = await res.json()
        toast.error(data.error === 'Token inválido' ? 'Token inválido. Verifique e tente novamente.' : 'Erro ao liberar módulo')
      }
    } catch {
      toast.error('Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  // Carregando
  if (liberado === null) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Liberado — renderiza o conteúdo normalmente
  if (liberado) return <>{children}</>

  // Bloqueado — mostra a tela de unlock
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md border-2">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Lock className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Módulo Bloqueado</h2>
            <p className="text-muted-foreground text-sm">
              O módulo <strong>{nomeModulo}</strong> requer um token de ativação.
            </p>
            <p className="text-muted-foreground text-xs">
              Após inserir o token correto, o acesso fica liberado permanentemente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Digite o token de ativação"
                className="pl-9 text-center tracking-widest"
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLiberar()}
                disabled={loading}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLiberar}
              disabled={loading || !token.trim()}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                : <><Unlock className="mr-2 h-4 w-4" /> Ativar Módulo</>
              }
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Entre em contato com seu fornecedor do sistema para obter o token.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
