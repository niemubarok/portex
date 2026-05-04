import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'

export async function addWatermarkAndQRBrowser(
  inputArrayBuffer: ArrayBuffer, 
  qrText: string, 
  watermarkText: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(inputArrayBuffer)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Generate QR Code as Data URL
  const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, scale: 8 })
  const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer())
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  for (const page of pages) {
    const { width, height } = page.getSize()

    // 1. Add Diagonal Watermark Text
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 4,
      size: 60,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.2,
      rotate: degrees(45),
    })

    // 2. Add QR Code at Bottom Right
    const qrSize = 60
    page.drawImage(qrImage, {
      x: width - qrSize - 40,
      y: 40,
      width: qrSize,
      height: qrSize,
    })
    
    // Add QR Label
    page.drawText('VERIFIED BY PORTEX', {
      x: width - qrSize - 40,
      y: 30,
      size: 6,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  return await pdfDoc.save()
}
