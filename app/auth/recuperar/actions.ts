'use server'

import {
  getUserByEmail,
  createPasswordResetToken,
  getValidResetToken,
  markResetTokenUsed,
  hashPassword,
  updateUserPassword,
} from '@/lib/auth'

export async function requestResetAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return { error: 'Informe o email da conta.' }
  }

  const user = await getUserByEmail(email)   // ← await adicionado
  if (!user) {
    return { error: 'Nenhuma conta encontrada com esse email.' }
  }

  const token = await createPasswordResetToken(user.id)  // ← await adicionado

  return {
    success: true,
    token,
    message: 'Token de recuperacao gerado com sucesso.',
  }
}

export async function resetPasswordAction(formData: FormData) {
  const token = (formData.get('token') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!token) {
    return { error: 'Token de recuperacao invalido.' }
  }

  if (!password || !confirmPassword) {
    return { error: 'Preencha a nova senha e a confirmacao.' }
  }

  if (password !== confirmPassword) {
    return { error: 'As senhas nao coincidem.' }
  }

  if (password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  }

  const resetData = await getValidResetToken(token)   // ← await adicionado
  if (!resetData) {
    return { error: 'Token invalido ou expirado. Solicite uma nova recuperacao.' }
  }

  const hashedPassword = await hashPassword(password)
  await updateUserPassword(resetData.user_id, hashedPassword)  // ← await adicionado
  await markResetTokenUsed(token)                               // ← await adicionado

  return { success: true }
}
