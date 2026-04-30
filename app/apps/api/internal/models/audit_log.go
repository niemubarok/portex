package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog represents a auditlog in the system.
type AuditLog struct {
	ID        string         `gorm:"primarykey;size:36" json:"id"`
	Action string `gorm:"size:255" json:"action" binding:"required"`
	UserID     string `gorm:"size:36" json:"user_id"`
	User       *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	DocumentID string `gorm:"size:36" json:"document_id"`
	IPAddress string `gorm:"size:255" json:"ip_address" binding:"required"`
	Details string `gorm:"type:text" json:"details"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
