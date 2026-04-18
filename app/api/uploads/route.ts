import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

function getUploadsDir() {
  if (process.env.USER_DATA_PATH) {
    return path.join(process.env.USER_DATA_PATH, 'uploads')
  }
  return path.join(process.cwd(), 'public', 'uploads')
}

const isElectron = !!process.env.USER_DATA_PATH
const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const originalName = file.name || 'upload'
    const ext = originalName.split('.').pop() || 'bin'
    const filename = `${crypto.randomUUID()}.${ext}`

    // Vercel: usa Blob Storage
    if (isVercel) {
      const blob = await put(filename, file, { access: 'public' })
      return NextResponse.json({ url: blob.url })
    }

    // Electron ou dev local: salva no disco
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const uploadsDir = getUploadsDir()
    try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch {}
    fs.writeFileSync(path.join(uploadsDir, filename), buffer)

    return NextResponse.json({ url: `/api/file/${filename}` })
  } catch (error) {
    console.error('Erro upload:', error)
    return NextResponse.json({ error: 'Erro ao enviar arquivo' }, { status: 500 })
  }
}
