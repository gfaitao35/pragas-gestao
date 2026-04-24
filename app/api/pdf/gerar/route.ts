import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { html, filename } = await req.json()
    if (!html) return NextResponse.json({ error: 'HTML obrigatório' }, { status: 400 })

    let pdfBuffer: Buffer

    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // Produção (Vercel): usa chromium headless
      // @ts-ignore
      const chromium = await import('@sparticuz/chromium-min')
      // @ts-ignore
      const puppeteer = await import('puppeteer-core')

      const browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
        ),
        headless: true,
      })

      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      })
      await browser.close()
      pdfBuffer = Buffer.from(pdf)
    } else {
      // Dev local: usa puppeteer completo instalado localmente
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({ headless: true })
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      })
      await browser.close()
      pdfBuffer = Buffer.from(pdf)
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'documento.pdf'}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}