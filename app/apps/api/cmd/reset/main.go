package main

import (
	"flag"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"app/apps/api/internal/models"
)

func main() {
	email := flag.String("email", "admin@portex.com", "Email of the user to reset")
	password := flag.String("password", "admin123", "New password for the user")
	dbPath := flag.String("db", "e-document-portal.db", "Path to the SQLite database")
	flag.Parse()

	db, err := gorm.Open(sqlite.Open(*dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var user models.User
	if err := db.Where("email = ?", *email).First(&user).Error; err != nil {
		log.Fatalf("User with email %s not found: %v", *email, err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	if err := db.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		log.Fatalf("Failed to update password: %v", err)
	}

	fmt.Printf("\n✅ Success!\n")
	fmt.Printf("User: %s %s (%s)\n", user.FirstName, user.LastName, user.Email)
	fmt.Printf("New Password: %s\n\n", *password)
}
