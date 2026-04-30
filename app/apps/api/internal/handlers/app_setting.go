package handlers

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// AppSettingHandler handles appsetting endpoints.
type AppSettingHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of app_settings.
func (h *AppSettingHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
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

	allowedSorts := map[string]bool{"id": true, "created_at": true, "key": true, "value": true}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	query := h.DB.Model(&models.AppSetting{})

	if search != "" {
		query = query.Where("key LIKE ? OR value LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.AppSetting
	offset := (page - 1) * pageSize
	if err := query.Order(sortBy + " " + sortOrder).Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch app_settings",
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

// GetByID returns a single appsetting by ID.
func (h *AppSettingHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.AppSetting
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AppSetting not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// Create adds a new appsetting.
func (h *AppSettingHandler) Create(c *gin.Context) {
	var req struct {
		Key string `json:"key" binding:"required"`
		Value string `json:"value"`
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

	item := models.AppSetting{
		Key: req.Key,
		Value: req.Value,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create appsetting",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "AppSetting created successfully",
	})
}

// Update modifies an existing appsetting.
func (h *AppSettingHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.AppSetting
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AppSetting not found",
			},
		})
		return
	}

	var req struct {
		Key string `json:"key"`
		Value string `json:"value"`
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
	if req.Key != "" {
		updates["key"] = req.Key
	}
	if req.Value != "" {
		updates["value"] = req.Value
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update appsetting",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "AppSetting updated successfully",
	})
}

// Delete soft-deletes a appsetting.
func (h *AppSettingHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.AppSetting
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "AppSetting not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete appsetting",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "AppSetting deleted successfully",
	})
}
