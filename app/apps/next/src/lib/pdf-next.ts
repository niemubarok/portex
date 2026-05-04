import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

export async function addWatermarkAndQR(inputBuffer: Buffer, qrText: string, watermarkText: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(inputBuffer)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Generate QR Code as Data URL then convert to buffer
  const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1 })
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  for (const page of pages) {
    const { width, height } = page.getSize()

    // 1. Add Diagonal Watermark Text
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.15,
      rotate: degrees(45),
    })

    // 2. Add QR Code at Bottom Right
    const qrSize = width * 0.07
    page.drawImage(qrImage, {
      x: width - qrSize - 50,
      y: 50,
      width: qrSize,
      height: qrSize,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
