/**
 * Abre HTML como PDF real no visualizador do browser.
 * - Em Electron: usa printToPDF via IPC → salva em /uploads → abre no browser
 * - Em navegador web normal: fallback para window.print()
 */
export async function openAsPdf(html: string, filename: string): Promise<void> {
  const electronPDF = (window as any).electronPDF

  if (electronPDF?.print) {
    try {
      await electronPDF.print(html, filename)
      return
    } catch (err) {
      console.error('Erro ao gerar PDF via Electron:', err)
      // fallback abaixo
    }
  }

  // Fallback: abre printWindow normal (browser web / dev)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print() }
  }
}