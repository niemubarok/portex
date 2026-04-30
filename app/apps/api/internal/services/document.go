package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

// DocumentService handles business logic for documents.
type DocumentService struct {
	DB *gorm.DB
}

// DocumentListParams holds pagination and filter parameters.
type DocumentListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of documents.
func (s *DocumentService) List(params DocumentListParams) ([]models.Document, int64, int, error) {
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

	query := s.DB.Model(&models.Document{})

	if params.Search != "" {
		query = query.Where("title ILIKE ? OR status ILIKE ? OR po_path ILIKE ? OR invoice_path ILIKE ? OR packing_list_path ILIKE ? OR peb_path ILIKE ? OR bl_path ILIKE ? OR other_path ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.Document
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching documents: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single document by ID.
func (s *DocumentService) GetByID(id string) (*models.Document, error) {
	var item models.Document
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}
	return &item, nil
}

// Create creates a new document.
func (s *DocumentService) Create(item *models.Document) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating document: %w", err)
	}
	return nil
}

// Update modifies an existing document.
func (s *DocumentService) Update(id string, updates map[string]interface{}) (*models.Document, error) {
	var item models.Document
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating document: %w", err)
	}

	s.DB.First(&item, "id = ?", id)
	return &item, nil
}

// Delete soft-deletes a document.
func (s *DocumentService) Delete(id string) error {
	var item models.Document
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return fmt.Errorf("document not found: %w", err)
	}
	if err := s.DB.Delete(&item).Error; err != nil {
		return fmt.Errorf("deleting document: %w", err)
	}
	return nil
}
