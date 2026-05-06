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

export async function addDigitalSignature(
  inputBuffer: Buffer, 
  qrText: string, 
  signerName: string, 
  signerRole: string,
  dateStr: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(inputBuffer)
  const pages = pdfDoc.getPages()
  
  // Use first and last page (usually where signatures are)
  const targetPages = pages.length > 1 ? [pages[0], pages[pages.length - 1]] : [pages[0]]
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  // Generate QR Code as Data URL then convert to buffer
  const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, color: { dark: '#023047', light: '#ffffff' } })
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  for (const page of targetPages) {
    const { width, height } = page.getSize()

    // Signature box dimensions
    const boxWidth = 250
    const boxHeight = 100
    // Put it at bottom left, where manual signatures usually are in PT Semen Tonasa docs
    const x = 50
    const y = 80

    // 1. Draw a white rectangle to cover the manual signature area
    page.drawRectangle({
      x: x,
      y: y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(1, 1, 1),
      opacity: 0.95, // mostly opaque white to hide what's underneath
    })

    // 2. Draw border
    page.drawRectangle({
      x: x,
      y: y,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0, 0.4, 0.8), // Blue border
      borderWidth: 2,
      color: rgb(0.95, 0.98, 1), // Light blue background
    })

    // 3. Draw QR Code
    const qrSize = 80
    page.drawImage(qrImage, {
      x: x + 10,
      y: y + 10,
      width: qrSize,
      height: qrSize,
    })

    // 4. Draw Text
    const textX = x + 100
    let currentY = y + boxHeight - 20

    page.drawText('DIGITALLY SIGNED', {
      x: textX,
      y: currentY,
      size: 12,
      font: font,
      color: rgb(0, 0.4, 0.8),
    })

    currentY -= 15
    page.drawText(signerName, {
      x: textX,
      y: currentY,
      size: 10,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    })

    currentY -= 12
    page.drawText(signerRole, {
      x: textX,
      y: currentY,
      size: 8,
      font: normalFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    currentY -= 12
    page.drawText(`Date: ${dateStr}`, {
      x: textX,
      y: currentY,
      size: 8,
      font: normalFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    currentY -= 12
    page.drawText('Verified via PortEx Portal', {
      x: textX,
      y: currentY,
      size: 7,
      font: normalFont,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

