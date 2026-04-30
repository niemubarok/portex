package models

import (
	"time"
)

// Setting represents a global application configuration.
type Setting struct {
	Key       string    `json:"key" gorm:"primaryKey;type:varchar(100)"`
	Value     string    `json:"value" gorm:"type:text"`
	UpdatedAt time.Time `json:"updated_at"`
}
