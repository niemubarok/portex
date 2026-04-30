package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// SettingHandler handles configuration endpoints.
type SettingHandler struct {
	DB *gorm.DB
}

// GetList returns all settings as a map
func (h *SettingHandler) GetList(c *gin.Context) {
	var settings []models.Setting
	if err := h.DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load settings"})
		return
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	// Supply default if empty
	if _, ok := result["retention_years"]; !ok {
		result["retention_years"] = "10"
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// Update settings
func (h *SettingHandler) Update(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	for k, v := range req {
		setting := models.Setting{Key: k}
		if err := h.DB.FirstOrCreate(&setting, models.Setting{Key: k}).Error; err != nil {
			continue
		}
		h.DB.Model(&setting).Update("value", v)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Settings updated successfully",
	})
}
