package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppSetting represents a appsetting in the system.
type AppSetting struct {
	ID        string         `gorm:"primarykey;size:36" json:"id"`
	Key string `gorm:"size:255" json:"key" binding:"required"`
	Value string `gorm:"type:text" json:"value"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *AppSetting) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
