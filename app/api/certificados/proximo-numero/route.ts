// app/api/certificados/proximo-numero/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const prefixo = `CERT-${ano}-${mes}-`

    const [result] = await sql`
      SELECT numero_certificado FROM certificados
      WHERE user_id = ${userId} AND numero_certificado LIKE ${prefixo + '%'}
      ORDER BY numero_certificado DESC LIMIT 1
    `

    let seq = 1
    if (result) {
      const partes = result.numero_certificado.split('-')
      const ultimo = parseInt(partes[partes.length - 1], 10)
      if (!isNaN(ultimo)) seq = ultimo + 1
    }

    const numero = `${prefixo}${String(seq).padStart(3, '0')}`
    return NextResponse.json({ numero })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
