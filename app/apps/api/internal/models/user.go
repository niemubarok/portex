package models

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Role constants
const (
	RoleAdmin   = "ADMIN"
	RoleOfficer = "OFFICER"
	RoleManager = "MANAGER"
	RoleAuditor = "AUDITOR"
	// grit:roles
)

// User represents a user in the system.
type User struct {
	ID              string         `gorm:"primarykey;size:36" json:"id"`
	FirstName       string         `gorm:"size:255;not null" json:"first_name" binding:"required"`
	LastName        string         `gorm:"size:255;not null" json:"last_name" binding:"required"`
	Email           string         `gorm:"size:255;uniqueIndex;not null" json:"email" binding:"required,email"`
	Password        string         `gorm:"size:255" json:"-"`
	Role            string         `gorm:"size:20;default:USER" json:"role"`
	Avatar          string         `gorm:"size:500" json:"avatar"`
	JobTitle        string         `gorm:"size:255" json:"job_title"`
	Bio             string         `gorm:"type:text" json:"bio"`
	Active          bool           `gorm:"default:true" json:"active"`
	Provider        string         `gorm:"size:50;default:'local'" json:"provider"`
	GoogleID        string         `gorm:"size:255" json:"-"`
	GithubID        string         `gorm:"size:255" json:"-"`
	EmailVerifiedAt *time.Time     `json:"email_verified_at"`
	IPAddress       string         `gorm:"size:45" json:"ip_address"`
	MACAddress      string         `gorm:"size:50" json:"mac_address"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID and hashes the password before saving.
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	if u.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(hashedPassword)
	}
	return nil
}


// CheckPassword compares the given password with the stored hash.
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// Models returns the ordered list of all models for migration.
// Models with no foreign key dependencies come first.
func Models() []interface{} {
	return []interface{}{
		&User{},
		&Document{},
		&AuditLog{},
		&Setting{},
		&Upload{},
		&Blog{},
		&UIComponent{},
		// grit:models
	}
}

// Migrate runs database migrations only for tables that don't exist yet.
// It prints which tables were created and which were skipped.
func Migrate(db *gorm.DB) error {
	models := Models()
	migrated := 0

	// Use Silent logger during migration to suppress schema inspection SQL noise
	silentDB := db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})

	for _, model := range models {
		if err := silentDB.AutoMigrate(model); err != nil {
			return fmt.Errorf("migrating %T: %w", model, err)
		}
		log.Printf("  ✓ %T — auto-migrated", model)
		migrated++
	}

	if migrated == 0 {
		log.Println("All tables are up to date — nothing to migrate.")
	} else {
		log.Printf("Migrated %d table(s).", migrated)
	}

	return nil
}
