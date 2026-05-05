package handlers

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// AuditLogHandler handles auditlog endpoints.
type AuditLogHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of audit_logs.
func (h *AuditLogHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	
	// New filters
	docID := c.Query("document_id")
	if docID == "" {
		docID = c.Query("documentId")
	}
	userID := c.Query("user_id")
	if userID == "" {
		userID = c.Query("userId")
	}
	action := c.Query("action")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	allowedSorts := map[string]bool{"id": true, "created_at": true, "action": true, "user_id": true, "document_id": true, "ip_address": true, "details": true}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	query := h.DB.Model(&models.AuditLog{}).Preload("User")

	if docID != "" {
		query = query.Where("document_id = ?", docID)
	}
	
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	
	if action != "" {
		query = query.Where("audit_logs.action LIKE ?", "%"+action+"%")
	}
	
	if startDate != "" {
		query = query.Where("audit_logs.created_at >= ?", startDate)
	}
	
	if endDate != "" {
		query = query.Where("audit_logs.created_at <= ?", endDate)
	}

	if search != "" {
		// Join User table to search by user name/email
		query = query.Joins("LEFT JOIN users ON audit_logs.user_id = users.id").
			Where("audit_logs.action LIKE ? OR audit_logs.ip_address LIKE ? OR audit_logs.details LIKE ? OR users.first_name LIKE ? OR users.last_name LIKE ? OR users.email LIKE ?", 
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.AuditLog
	offset := (page - 1) * pageSize
	if err := query.Order("audit_logs." + sortBy + " " + sortOrder).Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch audit_logs",
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

// GetByID returns a single auditlog by ID.
func (h *AuditLogHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.AuditLog
	if err := h.DB.Preload("User").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AuditLog not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// Create adds a new auditlog.
func (h *AuditLogHandler) Create(c *gin.Context) {
	var req struct {
		Action     string `json:"action" binding:"required"`
		UserID     string `json:"user_id"`
		DocumentID string `json:"document_id"`
		IPAddress  string `json:"ip_address" binding:"required"`
		Details    string `json:"details"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	item := models.AuditLog{
		Action: req.Action,
		UserID: req.UserID,
		DocumentID: req.DocumentID,
		IPAddress: req.IPAddress,
		Details: req.Details,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create auditlog",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "AuditLog created successfully",
	})
}

// Update modifies an existing auditlog.
func (h *AuditLogHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.AuditLog
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AuditLog not found",
			},
		})
		return
	}

	var req struct {
		Action     string  `json:"action"`
		UserID     *string `json:"user_id"`
		DocumentID *string `json:"document_id"`
		IPAddress  string  `json:"ip_address"`
		Details    string  `json:"details"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Action != "" {
		updates["action"] = req.Action
	}
	if req.UserID != nil {
		updates["user_id"] = *req.UserID
	}
	if req.DocumentID != nil {
		updates["document_id"] = *req.DocumentID
	}
	if req.IPAddress != "" {
		updates["ip_address"] = req.IPAddress
	}
	if req.Details != "" {
		updates["details"] = req.Details
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update auditlog",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "AuditLog updated successfully",
	})
}

// Delete soft-deletes a auditlog.
func (h *AuditLogHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.AuditLog
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AuditLog not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete auditlog",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "AuditLog deleted successfully",
	})
}
