package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// AppSettingService handles business logic for app_settings.
type AppSettingService struct {
	DB *gorm.DB
}

// AppSettingListParams holds pagination and filter parameters.
type AppSettingListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of app_settings.
func (s *AppSettingService) List(params AppSettingListParams) ([]models.AppSetting, int64, int, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	if params.SortOrder != "asc" && params.SortOrder != "desc" {
		params.SortOrder = "desc"
	}
	if params.SortBy == "" {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.AppSetting{})

	if params.Search != "" {
		query = query.Where("key ILIKE ? OR value ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.AppSetting
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching app_settings: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single appsetting by ID.
func (s *AppSettingService) GetByID(id string) (*models.AppSetting, error) {
	var item models.AppSetting
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("appsetting not found: %w", err)
	}
	return &item, nil
}

// Create creates a new appsetting.
func (s *AppSettingService) Create(item *models.AppSetting) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating appsetting: %w", err)
	}
	return nil
}

// Update modifies an existing appsetting.
func (s *AppSettingService) Update(id string, updates map[string]interface{}) (*models.AppSetting, error) {
	var item models.AppSetting
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("appsetting not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating appsetting: %w", err)
	}

	s.DB.First(&item, "id = ?", id)
	return &item, nil
}

// Delete soft-deletes a appsetting.
func (s *AppSettingService) Delete(id string) error {
	var item models.AppSetting
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return fmt.Errorf("appsetting not found: %w", err)
	}
	if err := s.DB.Delete(&item).Error; err != nil {
		return fmt.Errorf("deleting appsetting: %w", err)
	}
	return nil
}
