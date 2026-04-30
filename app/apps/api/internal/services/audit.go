package services

import (
	"log"
	"app/apps/api/internal/models"
	"gorm.io/gorm"
)

// AuditService handles audit log creation.
type AuditService struct {
	DB *gorm.DB
}

// Log records an action in the audit log.
func (s *AuditService) Log(action, userID, documentID, ipAddress, details string) error {
	if s.DB == nil {
		log.Printf("[AuditService] Error: DB instance is nil, cannot log action %s", action)
		return nil // Return nil to avoid crashing the caller
	}

	auditLog := models.AuditLog{
		Action:     action,
		UserID:     userID,
		DocumentID: documentID,
		IPAddress:  ipAddress,
		Details:    details,
	}

	err := s.DB.Create(&auditLog).Error
	if err != nil {
		log.Printf("[AuditService] Failed to create audit log (%s): %v", action, err)
	} else {
		log.Printf("[AuditService] Audit log created successfully: %s (User: %s, Doc: %s)", action, userID, documentID)
	}
	return err
}
