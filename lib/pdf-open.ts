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
      // Abre o PDF no leitor do browser em nova aba
      // O usuário pode visualizar e depois salvar manualmente se quiser
      window.open(url, '_blank')
      // Libera a memória após 60 segundos
      setTimeout(() => URL.revokeObjectURL(url), 60000)
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