package handlers

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/config"
	"app/apps/api/internal/models"
	"app/apps/api/internal/services"
)

// DocumentHandler handles document endpoints.
type DocumentHandler struct {
	DB         *gorm.DB
	AuditSvc   *services.AuditService
	PDFSvc     *services.PDFService
	StorageSvc services.StorageService
	Config     *config.Config
}

// List returns a paginated list of documents.
func (h *DocumentHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	allowedSorts := map[string]bool{"id": true, "created_at": true, "title": true, "status": true, "po_path": true, "invoice_path": true, "packing_list_path": true, "peb_path": true, "bl_path": true, "other_path": true, "retention_years": true, "uploader_id": true}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	query := h.DB.Model(&models.Document{})

	// Filter by ownership if not Admin, Manager, or Auditor
	if userRole != models.RoleAdmin && userRole != models.RoleManager && userRole != models.RoleAuditor {
		query = query.Where("uploader_id = ?", userID)
	}

	q := c.Query("q")
	if q == "" {
		q = c.Query("search")
	}
	status := c.Query("status")

	if q != "" {
		query = query.Where("(title LIKE ? OR status LIKE ? OR po_path LIKE ? OR invoice_path LIKE ? OR packing_list_path LIKE ? OR peb_path LIKE ? OR bl_path LIKE ? OR other_path LIKE ?)", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%")
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var items []models.Document
	offset := (page - 1) * pageSize
	if err := query.Order(sortBy + " " + sortOrder).Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch documents",
			},
		})
		return
	}

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetByID returns a single document by ID.
func (h *DocumentHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Document not found",
			},
		})
		return
	}

	// Check ownership if not Admin, Manager, or Auditor
	if userRole != models.RoleAdmin && userRole != models.RoleManager && userRole != models.RoleAuditor {
		if item.UploaderID != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "You do not have permission to view this document",
				},
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// Create adds a new document.
func (h *DocumentHandler) Create(c *gin.Context) {
	log.Printf("[DEBUG] Create Document - Content-Length: %d, Content-Type: %s", c.Request.ContentLength, c.GetHeader("Content-Type"))
	
	// Let Gin parse the multipart form automatically with its configured memory limit
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("[DEBUG] MultipartForm parsing error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Failed to parse form: " + err.Error()},
		})
		return
	}
	log.Printf("[DEBUG] Parsed form keys: %v", form.Value)

	title := c.PostForm("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": "Title is required"}})
		return
	}

	// Fetch global retention setting
	var retentionSetting models.Setting
	retentionYears := 10 // Default
	if err := h.DB.First(&retentionSetting, "key = ?", "retention_years").Error; err == nil {
		if val, err := strconv.Atoi(retentionSetting.Value); err == nil {
			retentionYears = val
		}
	}

	userIDVal, _ := c.Get("user_id")
	userID, _ := userIDVal.(string)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	uploaderID := userID

	// Helper to upload files
	uploadFile := func(field string) (string, error) {
		file, err := c.FormFile(field)
		if err != nil {
			return "", nil // file not provided
		}
		path := "storage/documents/" + strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + file.Filename
		savedPath, err := h.StorageSvc.UploadFile(file, path)
		if err != nil {
			log.Printf("Failed to upload file: %v", err)
			return "", err
		}
		return savedPath, nil
	}

	poPath, err := uploadFile("po_file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "UPLOAD_FAILED", "message": "Failed to upload PO file: " + err.Error()}})
		return
	}
	if poPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": "Purchase Order (PO) file is required"}})
		return
	}

	invoicePath, _ := uploadFile("invoice_file")
	packingListPath, _ := uploadFile("packing_list_file")
	pebPath, _ := uploadFile("peb_file")
	blPath, _ := uploadFile("bl_file")
	otherPath, _ := uploadFile("other_file")

	item := models.Document{
		Title:           title,
		Status:          "Draft",
		PoPath:          poPath,
		InvoicePath:     invoicePath,
		PackingListPath: packingListPath,
		PebPath:         pebPath,
		BlPath:          blPath,
		OtherPath:       otherPath,
		RetentionYears:  retentionYears,
		UploaderID:      uploaderID,
		Notes:           c.PostForm("notes"),
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create document",
			},
		})
		return
	}

	// Audit Log
	log.Printf("[DocumentHandler] Calling AuditSvc.Log for document %s", item.ID)
	err = h.AuditSvc.Log("UPLOAD_DOCUMENT", uploaderID, item.ID, c.ClientIP(), "Document created with title: "+item.Title)
	if err != nil {
		log.Printf("[DocumentHandler] AuditSvc.Log failed: %v", err)
	} else {
		log.Printf("[DocumentHandler] AuditSvc.Log succeeded")
	}

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Document created successfully",
	})
}

// Update modifies an existing document.
func (h *DocumentHandler) Update(c *gin.Context) {
	id := c.Param("id")

	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Document not found",
			},
		})
		return
	}

	// Check ownership/permissions for update
	if userRole != models.RoleAdmin {
		if item.UploaderID != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "You can only update your own documents",
				},
			})
			return
		}

		if item.Status != models.StatusDraft {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "Only draft documents can be updated",
				},
			})
			return
		}
	}

	log.Printf("[DEBUG] Update Document - Content-Length: %d, Content-Type: %s", c.Request.ContentLength, c.GetHeader("Content-Type"))
	
	if _, err := c.MultipartForm(); err != nil {
		log.Printf("[DEBUG] MultipartForm parsing error: %v", err)
		_ = c.Request.ParseForm() // fallback
	}

	updates := map[string]interface{}{}

	if title := c.PostForm("title"); title != "" {
		updates["title"] = title
	}
	if status := c.PostForm("status"); status != "" {
		updates["status"] = status
	}
	if retentionStr := c.PostForm("retention_years"); retentionStr != "" {
		if retentionYears, err := strconv.Atoi(retentionStr); err == nil {
			updates["retention_years"] = retentionYears
		}
	}
	if uploaderID := c.PostForm("uploader_id"); uploaderID != "" && userRole == models.RoleAdmin {
		updates["uploader_id"] = uploaderID
	}
	if notes := c.PostForm("notes"); notes != "" {
		updates["notes"] = notes
	}

	// Helper to upload files
	uploadFile := func(field string) (string, error) {
		file, err := c.FormFile(field)
		if err != nil {
			return "", nil // file not provided
		}
		path := "storage/documents/" + strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + file.Filename
		savedPath, err := h.StorageSvc.UploadFile(file, path)
		if err != nil {
			log.Printf("Failed to upload file: %v", err)
			return "", err
		}
		return savedPath, nil
	}

	if path, err := uploadFile("po_file"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "UPLOAD_FAILED", "message": "Failed to upload PO file: " + err.Error()}})
		return
	} else if path != "" {
		updates["po_path"] = path
	}
	if path, _ := uploadFile("invoice_file"); path != "" {
		updates["invoice_path"] = path
	}
	if path, _ := uploadFile("packing_list_file"); path != "" {
		updates["packing_list_path"] = path
	}
	if path, _ := uploadFile("peb_file"); path != "" {
		updates["peb_path"] = path
	}
	if path, _ := uploadFile("bl_file"); path != "" {
		updates["bl_path"] = path
	}
	if path, _ := uploadFile("other_file"); path != "" {
		updates["other_path"] = path
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update document",
			},
		})
		return
	}

	// Audit Log
	h.AuditSvc.Log("UPDATE_DOCUMENT", userID, item.ID, c.ClientIP(), "Document updated")

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Document updated successfully",
	})
}

// Delete soft-deletes a document.
func (h *DocumentHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Document not found",
			},
		})
		return
	}

	// Check ownership/permissions for delete
	if userRole != models.RoleAdmin {
		if item.UploaderID != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "You can only delete your own documents",
				},
			})
			return
		}

		if item.Status != models.StatusDraft {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "Only draft documents can be deleted",
				},
			})
			return
		}
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete document",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Document deleted successfully",
	})
}

// Approve handles document approval (Draft -> Approved -> Locked).
func (h *DocumentHandler) Approve(c *gin.Context) {
	id := c.Param("id")
	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if userRole != models.RoleManager && userRole != models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "Only managers can approve documents"},
		})
		return
	}

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Document not found"},
		})
		return
	}

	newStatus := ""
	action := ""
	details := ""

	if item.Status == models.StatusDraft {
		newStatus = models.StatusApproved
		action = "APPROVE_LEVEL_1"
		details = "Document approved by " + userRole
	} else if item.Status == models.StatusApproved {
		newStatus = models.StatusLocked
		action = "APPROVE_FINAL"
		details = "Document locked by " + userRole
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Document is already locked or in invalid status for approval"},
		})
		return
	}

	updates := map[string]interface{}{
		"status":        newStatus,
		"manager_notes": c.PostForm("manager_notes"),
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "Failed to approve document"})
		return
	}

	// If status is Locked, process ALL PDF files
	if newStatus == models.StatusLocked {
		qrText := fmt.Sprintf("%s/verify/%s", h.Config.AppURL, item.ID)
		watermarkText := fmt.Sprintf("PORTEX - %s - %s", strings.ToUpper(newStatus), time.Now().Format("2006-01-02"))
		
		log.Printf("[Approve] Document %s locked. Starting PDF watermarking...", item.ID)

		// Map of fields to process
		files := map[string]string{
			"PO":           item.PoPath,
			"Invoice":      item.InvoicePath,
			"Packing List": item.PackingListPath,
			"PEB":          item.PebPath,
			"B/L":          item.BlPath,
			"Other":        item.OtherPath,
		}

		for name, path := range files {
			if path == "" {
				continue
			}
			
			// Only process PDF files
			if !strings.HasSuffix(strings.ToLower(path), ".pdf") {
				log.Printf("[Approve] Skipping non-PDF file: %s (%s)", name, path)
				continue
			}

			// Ensure temp directory exists
			tmpDir := "storage/tmp"
			if err := os.MkdirAll(tmpDir, 0755); err != nil {
				log.Printf("[Approve] Failed to create temp dir: %v", err)
				continue
			}

			// Work with a local copy for PDF processing
			localPath := filepath.Join(tmpDir, filepath.Base(path))
			log.Printf("[Approve] Downloading %s to %s", path, localPath)
			
			if err := h.StorageSvc.DownloadFile(path, localPath); err == nil {
				lockedLocalPath := localPath + ".locked"
				
				log.Printf("[Approve] Adding watermark and QR to %s", localPath)
				if err := h.PDFSvc.AddWatermarkAndQR(localPath, lockedLocalPath, qrText, watermarkText); err == nil {
					// Lock it further (Disable edits)
					log.Printf("[Approve] Locking PDF: %s", lockedLocalPath)
					if err := h.PDFSvc.LockPDF(lockedLocalPath, lockedLocalPath); err != nil {
						log.Printf("[Approve] Warning: failed to apply encryption/lock to %s: %v", name, err)
					}
					
					// Upload the locked version back to storage (overwriting original)
					log.Printf("[Approve] Uploading processed PDF back to %s", path)
					if _, err := h.StorageSvc.UploadLocalFile(lockedLocalPath, path); err != nil {
						log.Printf("[Approve] ERROR: Failed to upload locked PDF for %s: %v", name, err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "STORAGE_ERROR", "message": "Failed to upload processed document: " + err.Error()}})
						return
					} else {
						log.Printf("[Approve] Successfully processed and updated %s", name)
					}
				} else {
					log.Printf("[Approve] ERROR: Failed to watermark PDF for %s: %v", name, err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "PDF_ERROR", "message": "Failed to process PDF: " + err.Error()}})
					return
				}
				
				// Cleanup local files
				os.Remove(localPath)
				os.Remove(lockedLocalPath)
			} else {
				log.Printf("[Approve] ERROR: Failed to download PDF for processing (%s): %v", name, err)
			}
		}
	}

	h.AuditSvc.Log(action, userID, item.ID, c.ClientIP(), details)

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Document " + strings.ToLower(newStatus) + " successfully",
	})
}

// Download serves a document file and logs the activity.
func (h *DocumentHandler) Download(c *gin.Context) {
	id := c.Param("id")
	fileType := c.Query("type") // po, invoice, packing_list, peb, bl, other

	userRoleVal, _ := c.Get("user_role")
	userIDVal, _ := c.Get("user_id")
	userRole, _ := userRoleVal.(string)
	userID, _ := userIDVal.(string)

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// Check permission
	if userRole != models.RoleAdmin && userRole != models.RoleManager && userRole != models.RoleAuditor {
		if item.UploaderID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
	}

	var filePath string
	var fileName string

	switch fileType {
	case "po":
		filePath = item.PoPath
		fileName = "PO_" + item.Title + filepath.Ext(filePath)
	case "invoice":
		filePath = item.InvoicePath
		fileName = "Invoice_" + item.Title + filepath.Ext(filePath)
	case "packing_list":
		filePath = item.PackingListPath
		fileName = "PackingList_" + item.Title + filepath.Ext(filePath)
	case "peb":
		filePath = item.PebPath
		fileName = "PEB_" + item.Title + filepath.Ext(filePath)
	case "bl":
		filePath = item.BlPath
		fileName = "BL_" + item.Title + filepath.Ext(filePath)
	case "other":
		filePath = item.OtherPath
		fileName = "Other_" + item.Title + filepath.Ext(filePath)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
		return
	}

	if filePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found in this document"})
		return
	}

	// Check if file exists on disk (if local)
	if _, ok := h.StorageSvc.(*services.LocalStorageService); ok {
		absPath, _ := filepath.Abs(filePath)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			log.Printf("[Download] File not found on disk: %s (Absolute: %s)", filePath, absPath)
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found on server storage"})
			return
		}
	}

	// Log download activity
	mode := c.Query("mode")
	action := "DOWNLOAD_DOCUMENT"
	details := "Downloaded " + fileType + " file"
	if mode == "view" {
		action = "VIEW_DOCUMENT"
		details = "Viewed " + fileType + " file in browser"
	}
	h.AuditSvc.Log(action, userID, item.ID, c.ClientIP(), details)

	// Set cache control to prevent seeing stale versions (important for watermarked PDFs)
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	// Serve file
	if _, ok := h.StorageSvc.(*services.LocalStorageService); ok {
		c.FileAttachment(filePath, fileName)
	} else {
		// S3 or other: download to temp and serve
		localPath := filepath.Join("storage/tmp", "download_"+strconv.FormatInt(time.Now().UnixNano(), 10)+"_"+filepath.Base(filePath))
		if err := h.StorageSvc.DownloadFile(filePath, localPath); err != nil {
			log.Printf("[Download] Failed to fetch from S3: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file from storage"})
			return
		}
		defer os.Remove(localPath)
		c.FileAttachment(localPath, fileName)
	}
}

// Verify checks the authenticity of a document (Public endpoint).
func (h *DocumentHandler) Verify(c *gin.Context) {
	id := c.Param("id")

	var item models.Document
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "INVALID",
			"message": "Document not found or invalid QR code",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "VALID",
		"data": gin.H{
			"id":         item.ID,
			"title":      item.Title,
			"status":     item.Status,
			"created_at": item.CreatedAt,
			"issuer":     "PT Semen Tonasa (PortEx System)",
		},
	})
}
