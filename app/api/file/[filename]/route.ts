import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function getUploadsDir() {
  return process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, 'uploads')
    : path.join(process.cwd(), 'public', 'uploads')
}

const mimeTypes: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  jfif: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  svg: 'image/svg+xml', pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params
    const safeName = path.basename(filename)
    const ext = safeName.split('.').pop()?.toLowerCase() || 'bin'
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    const { searchParams } = new URL(request.url)
    const wantsBase64 = searchParams.get('base64') === '1'

    // No Vercel não há disco local — este endpoint não é usado para servir arquivos
    // (as URLs já são públicas do Vercel Blob). Mas mantemos para compatibilidade
    // com Electron/dev onde o arquivo está no disco.
    const uploadsDir = getUploadsDir()
    const filePath = path.join(uploadsDir, safeName)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const buffer = fs.readFileSync(filePath)

    if (wantsBase64) {
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
      return NextResponse.json({ dataUrl })
    }

    const inlineTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
    const disposition = inlineTypes.includes(contentType) ? 'inline' : `attachment; filename=${safeName}`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Erro ao servir arquivo:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
