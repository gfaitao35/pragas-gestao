import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium-min"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { html, options = {} } = await request.json()

    if (!html) {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 })
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(
        "https://github.com/nicholasc/chromium-builds/releases/download/v131.0.6778.69/chromium-v131.0.6778.69-pack.tar"
      ),
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      printBackground: true,
      margin: options.margin || {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      ...options,
    })

    await browser.close()

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="document.pdf"',
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
