import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function getUploadsDir() {
  if (process.env.USER_DATA_PATH) {
    // Produção (Electron empacotado) — salva na pasta userData gravável
    return path.join(process.env.USER_DATA_PATH, 'uploads')
  }
  // Dev — salva em public/uploads (servido pelo Next.js)
  return path.join(process.cwd(), 'public', 'uploads')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as any
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const originalName = file.name || 'upload'
    const ext = originalName.split('.').pop() || 'png'
    const filename = `${crypto.randomUUID()}.${ext}`
    const uploadsDir = getUploadsDir()
    try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch (e) {}
    const outPath = path.join(uploadsDir, filename)
    fs.writeFileSync(outPath, buffer)

    // Sempre usa /api/file/ — funciona em dev e produção (Electron)
    const url = `/api/file/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Erro upload:', error)
    return NextResponse.json({ error: 'Erro ao enviar arquivo' }, { status: 500 })
  }
}