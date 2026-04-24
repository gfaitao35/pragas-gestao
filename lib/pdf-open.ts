/**
 * Gera e baixa um PDF a partir de HTML.
 * - Em Electron: usa printToPDF via IPC
 * - No Vercel/web: envia HTML para /api/pdf/gerar e faz download do PDF real
 * - Dev local sem puppeteer: fallback para window.print()
 */
export async function openAsPdf(html: string, filename: string): Promise<void> {
  // Electron
  const electronPDF = (window as any).electronPDF
  if (electronPDF?.print) {
    try {
      await electronPDF.print(html, filename)
      return
    } catch (err) {
      console.error('Erro ao gerar PDF via Electron:', err)
    }
  }

  // Web: tenta gerar PDF real via API
  try {
    const res = await fetch('/api/pdf/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const tab = window.open(url, '_blank')
      // Libera memória após a aba abrir
      if (tab) {
        tab.addEventListener('beforeunload', () => URL.revokeObjectURL(url))
      } else {
        // Popup bloqueado — fallback para download
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      return
    }
  } catch (err) {
    console.warn('API de PDF não disponível, usando window.print():', err)
  }

  // Fallback: abre janela de impressão do browser
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print() }
  }
}