'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  createSessionCookie,
  getSessionCookieName,
  getSessionCookieOptions,
  hashPassword,
  verifyPassword,
  getUserByEmail,
  createUser,
  generateId,
} from '@/lib/auth'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha email e senha.' }
  }

  const user = await getUserByEmail(email)   // ← await adicionado
  if (!user) {
    return { error: 'Email ou senha incorretos. Tente novamente.' }
  }

  const ok = await verifyPassword(password, user.senha)
  if (!ok) {
    return { error: 'Email ou senha incorretos. Tente novamente.' }
  }

  const cookieValue = createSessionCookie({
    userId: user.id,
    email: user.email,
    nome_completo: user.nome_completo,
    role: user.role,
  })

  const cookieStore = await cookies()
  cookieStore.set(getSessionCookieName(), cookieValue, getSessionCookieOptions())

  redirect('/dashboard')
}

export async function signUpAction(formData: FormData) {
  const nomeCompleto = ((formData.get('nome_completo') ?? formData.get('nomeCompleto')) as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = (formData.get('confirm_password') ?? formData.get('confirmPassword')) as string
  const role = ((formData.get('role') as string) || 'operador') as 'admin' | 'operador'
  const cnpj = (formData.get('cnpj') as string)?.trim()
  const nomeFantasia = (formData.get('nomeFantasia') as string)?.trim()
  const razaoSocial = (formData.get('razaoSocial') as string)?.trim()
  const logradouro = (formData.get('logradouro') as string)?.trim()
  const numero = (formData.get('numero') as string)?.trim()
  const bairro = (formData.get('bairro') as string)?.trim()
  const cidade = (formData.get('cidade') as string)?.trim()
  const estado = (formData.get('estado') as string)?.trim()
  const pais = (formData.get('pais') as string)?.trim()

  if (!nomeCompleto || !email || !password) {
    return { error: 'Preencha todos os campos obrigatórios.' }
  }

  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' }
  }

  if (password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  }

  const existing = await getUserByEmail(email)  // ← await adicionado
  if (existing) {
    return { error: 'Este email já está cadastrado.' }
  }

  const password_hash = await hashPassword(password)
  await createUser({                             // ← await adicionado
    email,
    senha: password_hash,
    nome_completo: nomeCompleto,
    role,
    cnpj,
    nome_fantasia: nomeFantasia,
    razao_social: razaoSocial,
    logradouro,
    numero,
    bairro,
    cidade,
    estado,
    pais,
  })

  return { success: true }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(getSessionCookieName())
  redirect('/auth/login')
}
