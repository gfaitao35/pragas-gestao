'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resetPasswordAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, KeyRound, Eye, EyeOff, Check } from 'lucide-react'

function RedefinirForm() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await resetPasswordAction(formData)

    if (result?.error) {
      setError(result.error)
    }
    if (result?.success) {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Senha Redefinida</CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso. Voce ja pode fazer login com a nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login">Ir para o Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            Insira sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <input type="hidden" name="token" value={tokenFromUrl} />

            <div className="space-y-2 relative">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimo 6 caracteres"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a nova senha"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir Senha
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RedefinirPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RedefinirForm />
    </Suspense>
  )
}
