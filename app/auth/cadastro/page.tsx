'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Building2, Eye, EyeOff } from 'lucide-react'

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'admin' | 'operador'>('operador')
  const [showPassword, setShowPassword] = useState(false)
  const [hasEnderecoFixo, setHasEnderecoFixo] = useState(false)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('role', role)

    const result = await signUpAction(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result?.success) setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Cadastro Realizado!</CardTitle>
            <CardDescription>
              Sua conta foi criada. Faça login para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login">Ir para Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>Preencha os dados abaixo para criar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Nome completo */}
            <div className="space-y-2">
              <Label htmlFor="nomeCompleto">Nome Completo do Atendente</Label>
              <Input id="nomeCompleto" name="nomeCompleto" type="text" placeholder="Seu nome completo" required disabled={loading} />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required disabled={loading} />
            </div>

            {/* Tipo de usuário */}
            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select value={role} onValueChange={(v: 'admin' | 'operador') => setRole(v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Senha com olhinho */}
            <div className="space-y-2 relative">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-2 top-[38px] text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2 relative">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Dados da empresa */}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ da Empresa</Label>
              <Input id="cnpj" name="cnpj" type="text" placeholder="00.000.000/0000-00" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input id="nomeFantasia" name="nomeFantasia" type="text" placeholder="Nome Fantasia" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input id="razaoSocial" name="razaoSocial" type="text" placeholder="Razão Social" required disabled={loading} />
            </div>

            {/* Endereço fixo */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enderecoFixo"
                checked={hasEnderecoFixo}
                onChange={() => setHasEnderecoFixo(!hasEnderecoFixo)}
                disabled={loading}
              />
              <Label htmlFor="enderecoFixo">Você tem local fixo?</Label>
            </div>

            {hasEnderecoFixo && (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" name="logradouro" type="text" placeholder="Rua Exemplo" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" type="text" placeholder="123" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" name="bairro" type="text" placeholder="Centro" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" name="cidade" type="text" placeholder="São Paulo" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" name="estado" type="text" placeholder="SP" disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="pais">País</Label>
                  <Input id="pais" name="pais" type="text" placeholder="Brasil" disabled={loading} />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Fazer Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
