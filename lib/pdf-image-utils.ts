/**
 * Converte uma URL de imagem local para base64 data URL.
 * Usa /api/file/?base64=1 para conversão server-side — funciona em dev e Electron.
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:')) return url

  try {
    // Normaliza: /uploads/xxx → /api/file/xxx
    let apiUrl = url
    if (url.startsWith('/uploads/')) {
      apiUrl = '/api/file/' + url.replace('/uploads/', '')
    }

    // Extrai filename e chama a API com ?base64=1
    // /api/file/xxx.png → filename = xxx.png
    const filename = apiUrl.replace(/^\/api\/file\//, '')
    const fullUrl = `http://localhost:3000/api/file/${filename}?base64=1`

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
