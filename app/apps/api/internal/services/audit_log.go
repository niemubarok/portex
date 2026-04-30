package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// AuditLogService handles business logic for audit_logs.
type AuditLogService struct {
	DB *gorm.DB
}

// AuditLogListParams holds pagination and filter parameters.
type AuditLogListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of audit_logs.
func (s *AuditLogService) List(params AuditLogListParams) ([]models.AuditLog, int64, int, error) {
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

	query := s.DB.Model(&models.AuditLog{})

	if params.Search != "" {
		query = query.Where("action ILIKE ? OR ip_address ILIKE ? OR details ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.AuditLog
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching audit_logs: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single auditlog by ID.
func (s *AuditLogService) GetByID(id string) (*models.AuditLog, error) {
	var item models.AuditLog
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("auditlog not found: %w", err)
	}
	return &item, nil
}

// Create creates a new auditlog.
func (s *AuditLogService) Create(item *models.AuditLog) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating auditlog: %w", err)
	}
	return nil
}

// Update modifies an existing auditlog.
func (s *AuditLogService) Update(id string, updates map[string]interface{}) (*models.AuditLog, error) {
	var item models.AuditLog
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("auditlog not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating auditlog: %w", err)
	}

	s.DB.First(&item, "id = ?", id)
	return &item, nil
}

// Delete soft-deletes a auditlog.
func (s *AuditLogService) Delete(id string) error {
	var item models.AuditLog
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return fmt.Errorf("auditlog not found: %w", err)
	}
	if err := s.DB.Delete(&item).Error; err != nil {
		return fmt.Errorf("deleting auditlog: %w", err)
	}
	return nil
}
