package handlers

import (
	"fmt"
	"math"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/models"
	"app/apps/api/internal/storage"
)

// AllowedMimeTypes defines which file types can be uploaded.
var AllowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"image/webp":      true,
	"application/pdf": true,
	"text/plain":      true,
}

// MaxUploadSize is the maximum file size (50 MB).
const MaxUploadSize = 50 << 20

// UploadHandler handles file upload endpoints.
type UploadHandler struct {
	DB      *gorm.DB
	Storage *storage.Storage
}

// Create handles file upload via multipart form.
func (h *UploadHandler) Create(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Storage unavailable"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	if header.Size > MaxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large"})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), strings.TrimSuffix(filepath.Base(header.Filename), ext), ext)
	key := fmt.Sprintf("uploads/%s/%s", time.Now().Format("2006/01"), filename)

	if err := h.Storage.Upload(c.Request.Context(), key, file, mimeType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	userID, _ := c.Get("user_id")
	upload := models.Upload{
		Filename:     filename,
		OriginalName: header.Filename,
		MimeType:     mimeType,
		Size:         header.Size,
		Path:         key,
		URL:          h.Storage.GetURL(key),
		UserID:       userID.(string),
	}

	if err := h.DB.Create(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": upload})
}

// List returns a paginated list of uploads.
func (h *UploadHandler) List(c *gin.Context) {
	var uploads []models.Upload
	h.DB.Order("created_at DESC").Find(&uploads)
	c.JSON(http.StatusOK, gin.H{"data": uploads})
}

// GetByID returns a single upload by ID.
func (h *UploadHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	var upload models.Upload
	if err := h.DB.First(&upload, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": upload})
}

// Delete removes an upload.
func (h *UploadHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var upload models.Upload
	if err := h.DB.First(&upload, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	if h.Storage != nil {
		_ = h.Storage.Delete(c.Request.Context(), upload.Path)
	}
	h.DB.Delete(&upload)
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
