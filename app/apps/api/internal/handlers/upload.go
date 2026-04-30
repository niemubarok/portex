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

var AllowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"image/webp":      true,
	"video/mp4":       true,
	"video/webm":      true,
	"video/quicktime": true,
	"application/pdf": true,
	"text/plain":      true,
	"text/csv":        true,
	"application/json": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

const MaxUploadSize = 50 << 20

type UploadHandler struct {
	DB      *gorm.DB
	Storage *storage.Storage
}

func (h *UploadHandler) Create(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Storage not configured"})
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
	if !AllowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed"})
		return
	}

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
		_ = h.Storage.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": upload})
}

func (h *UploadHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	query := h.DB.Model(&models.Upload{})
	var total int64
	query.Count(&total)

	var uploads []models.Upload
	offset := (page - 1) * pageSize
	h.DB.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&uploads)

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": uploads,
		"meta": gin.H{"total": total, "page": page, "pageSize": pageSize, "pages": pages},
	})
}

func (h *UploadHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	var upload models.Upload
	if err := h.DB.First(&upload, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": upload})
}

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

func (h *UploadHandler) Presign(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Storage not configured"})
		return
	}

	var req struct {
		Filename    string `json:"filename" binding:"required"`
		ContentType string `json:"content_type" binding:"required"`
		FileSize    int64  `json:"file_size" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ext := filepath.Ext(req.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), strings.TrimSuffix(filepath.Base(req.Filename), ext), ext)
	key := fmt.Sprintf("uploads/%s/%s", time.Now().Format("2006/01"), filename)

	presignedURL, err := h.Storage.PresignPutURL(c.Request.Context(), key, req.ContentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Presign failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"presigned_url": presignedURL,
			"key":           key,
			"public_url":    h.Storage.GetURL(key),
		},
	})
}

func (h *UploadHandler) CompleteUpload(c *gin.Context) {
	var req struct {
		Key         string `json:"key" binding:"required"`
		Filename    string `json:"filename" binding:"required"`
		ContentType string `json:"content_type" binding:"required"`
		Size        int64  `json:"size" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	upload := models.Upload{
		Filename:     filepath.Base(req.Key),
		OriginalName: req.Filename,
		MimeType:     req.ContentType,
		Size:         req.Size,
		Path:         req.Key,
		URL:          h.Storage.GetURL(req.Key),
		UserID:       userID.(string),
	}

	if err := h.DB.Create(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": upload})
}
