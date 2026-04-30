package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/skip2/go-qrcode"
)

// PDFService handles PDF manipulation like watermarking and QR codes.
type PDFService struct{}

// AddWatermarkAndQR adds a text watermark and a QR code image to a PDF.
func (s *PDFService) AddWatermarkAndQR(inputPath, outputPath, qrText, watermarkText string) error {
	// 1. Generate QR Code temporarily
	qrPath := filepath.Join(os.TempDir(), fmt.Sprintf("qr_%d.png", os.Getpid()))
	if err := qrcode.WriteFile(qrText, qrcode.Medium, 256, qrPath); err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}
	defer os.Remove(qrPath)

	// 2. Create a temporary file for the first pass (Text Watermark)
	tempWatermarkedPath := outputPath + ".tmp"
	
	// wmText: the text to display as watermark
	// fontname: Helvetica-Bold for thicker look
	// opacity: 0.15 for more transparency
	// scale: 0.8 for larger size
	wm, err := api.TextWatermark(watermarkText, "fontname:Helvetica-Bold, opacity:0.15, scale:0.8, rotation:45, color:0.5 0.5 0.5", true, false, 0)
	if err != nil {
		return fmt.Errorf("failed to create text watermark: %w", err)
	}

	// Apply text watermark to all pages
	// Use a configuration that disables validation to handle non-standard PDFs
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	if err := api.AddWatermarksFile(inputPath, tempWatermarkedPath, nil, wm, conf); err != nil {
		return fmt.Errorf("failed to add text watermark: %w", err)
	}
	defer os.Remove(tempWatermarkedPath)

	// 3. Add QR Code (Image)
	// position:br - bottom right anchor
	// scale:0.1 - 10% of page width
	// offset:-100 50 - move 100 points LEFT and 50 points UP from the corner
	qrWm, err := api.ImageWatermark(qrPath, "position:br, scale:0.07, offset:-100 50, rotation:0", true, false, 0)
	if err != nil {
		return fmt.Errorf("failed to create QR watermark: %w", err)
	}

	// Apply QR code on top of the text-watermarked file
	if err := api.AddWatermarksFile(tempWatermarkedPath, outputPath, nil, qrWm, conf); err != nil {
		return fmt.Errorf("failed to add QR code: %w", err)
	}

	return nil
}

// LockPDF sets the PDF to read-only (disables editing/copying).
func (s *PDFService) LockPDF(inputPath, outputPath string) error {
	// For standard "Locked" PDF, we want it to be readable by anyone
	// but protected against editing, copying, or printing.
	// We use an empty user password and a secure owner password.
	conf := model.NewAESConfiguration("tonasa-export-sales-secure-owner-pw", "", 256)
	conf.ValidationMode = model.ValidationRelaxed
	conf.Permissions = model.PermissionsPrint // Allow printing (reading is allowed implicitly if no user PW)
	
	if err := api.EncryptFile(inputPath, outputPath, conf); err != nil {
		return fmt.Errorf("failed to lock PDF: %w", err)
	}
	return nil
}
