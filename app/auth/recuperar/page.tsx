'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { requestResetAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, ArrowLeft, Copy, Check, KeyRound } from 'lucide-react'

export default function RecuperarPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResetToken(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await requestResetAction(formData)

    if (result?.error) {
      setError(result.error)
    }
    if (result?.success && result.token) {
      setResetToken(result.token)
    }

    setLoading(false)
  }

  const handleCopyToken = async () => {
    if (resetToken) {
      await navigator.clipboard.writeText(resetToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetLink = resetToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/recuperar/redefinir?token=${resetToken}`
    : ''

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Recuperar Conta</CardTitle>
          <CardDescription>
            Informe o email cadastrado para gerar um link de recuperacao de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!resetToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar link de recuperacao
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertDescription>
                  Link de recuperacao gerado com sucesso! Use o link abaixo para redefinir sua senha. O link expira em 1 hora.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Link de recuperacao</Label>
                <div className="flex gap-2">
                  <Input
                    value={resetLink}
                    readOnly
                    className="bg-muted text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button asChild className="w-full">
                <Link href={`/auth/recuperar/redefinir?token=${resetToken}`}>
                  Ir para redefinir senha
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setResetToken(null)
                  setError(null)
                }}
              >
                Gerar outro link
              </Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
