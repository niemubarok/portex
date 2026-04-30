package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect establishes a database connection using the provided DSN.
func Connect(dsn string) (*gorm.DB, error) {
	// Use Warn level by default — only logs slow queries and errors.
	logLevel := logger.Warn
	if os.Getenv("DB_LOG_LEVEL") == "info" {
		logLevel = logger.Info
	} else if os.Getenv("DB_LOG_LEVEL") == "silent" {
		logLevel = logger.Silent
	}

	var dialector gorm.Dialector
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		dialector = postgres.Open(dsn)
	} else {
		dialector = sqlite.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// SQLite-specific settings
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		// Enable WAL mode and busy timeout for better SQLite concurrency
		sqlDB.Exec("PRAGMA journal_mode=WAL;")
		sqlDB.Exec("PRAGMA busy_timeout=5000;")
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	log.Printf("Database connected successfully (DSN: %s)", dsn)
	return db, nil
}
