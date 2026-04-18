/**
 * Converte uma URL de imagem para base64 data URL.
 * Suporta: URLs do Vercel Blob (https://...), /api/file/..., /uploads/...
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:')) return url

  try {
    // URLs absolutas (Vercel Blob ou qualquer https://) — faz fetch direto
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url)
      if (!res.ok) return url
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = res.headers.get('content-type') || 'application/octet-stream'
      return `data:${contentType};base64,${buffer.toString('base64')}`
    }

    // URLs locais: /uploads/xxx → /api/file/xxx
    let apiUrl = url
    if (url.startsWith('/uploads/')) {
      apiUrl = '/api/file/' + url.replace('/uploads/', '')
    }

    // /api/file/xxx.png — chama com ?base64=1
    const filename = apiUrl.replace(/^\/api\/file\//, '')
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const fullUrl = `${base}/api/file/${filename}?base64=1`

    const res = await fetch(fullUrl)
    if (!res.ok) return url
    const json = await res.json()
    return json.dataUrl || url
  } catch {
    return url
  }
}

/**
 * Converte múltiplas URLs em paralelo
 */
export async function urlsToBase64(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(urlToBase64))
}
