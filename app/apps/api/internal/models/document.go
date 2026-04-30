package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Document statuses
const (
	StatusDraft    = "Draft"
	StatusApproved = "Approved"
	StatusLocked   = "Locked"
)

// Document represents a document in the system.
type Document struct {
	ID        string         `gorm:"primarykey;size:36" json:"id"`
	Title           string         `gorm:"size:255" json:"title" binding:"required"`
	Status          string         `gorm:"size:255" json:"status" binding:"required"`
	PoPath          string         `gorm:"size:255" json:"po_path" binding:"required"`
	InvoicePath     string         `gorm:"size:255" json:"invoice_path"`
	PackingListPath string         `gorm:"size:255" json:"packing_list_path"`
	PebPath         string         `gorm:"size:255" json:"peb_path"`
	BlPath          string         `gorm:"size:255" json:"bl_path"`
	OtherPath       string         `gorm:"size:255" json:"other_path"`
	RetentionYears  int            `json:"retention_years"`
	UploaderID      string         `gorm:"size:36" json:"uploader_id"`
	Notes           string         `gorm:"type:text" json:"notes"`
	ManagerNotes    string         `gorm:"type:text" json:"manager_notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *Document) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
