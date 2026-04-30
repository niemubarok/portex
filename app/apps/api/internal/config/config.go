package config

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// StorageConfig holds settings for S3-compatible storage.
type StorageConfig struct {
	Driver    string
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	Region    string
	UseSSL    bool
	PublicURL string
}

// Config holds all application configuration.
type Config struct {
	AppName     string
	AppEnv      string
	Port        string
	AppURL      string
	DatabaseURL string
	DBLogLevel  string

	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	CACHE_REDIS_URL string

	// Phase 4 Services Config
	Storage StorageConfig

	// OAuth2
	GoogleClientID     string
	GoogleClientSecret string
	GithubClientID     string
	GithubClientSecret string

	// Email
	ResendAPIKey string
	MailFrom     string

	// AI
	AIGatewayAPIKey string
	AIGatewayModel  string
	AIGatewayURL    string

	// Features
	CORSOrigins []string

	// GORM Studio
	GORMStudioEnabled  bool
	GORMStudioUsername string
	GORMStudioPassword string

	// Pulse Observability
	PulseEnabled  bool
	PulseUsername string
	PulsePassword string

	// Sentinel Security
	SentinelEnabled   bool
	SentinelUsername  string
	SentinelPassword  string
	SentinelSecretKey string

	// 2FA
	TOTPIssuer string
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		AppName:     getEnv("APP_NAME", "app"),
		AppEnv:      getEnv("APP_ENV", "development"),
		Port:        getEnv("APP_PORT", "8080"),
		AppURL:      getEnv("APP_URL", "http://localhost:8080"),
		DatabaseURL: getEnv("DATABASE_URL", "e-document-portal.db"),
		DBLogLevel:  getEnv("DB_LOG_LEVEL", "warn"),

		JWTSecret:        getEnv("JWT_SECRET", "your-secret-key"),
		JWTAccessExpiry:  parseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m")),
		JWTRefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h")),

		CACHE_REDIS_URL: getEnv("CACHE_REDIS_URL", ""),

		Storage: StorageConfig{
			Driver:    getEnv("STORAGE_DRIVER", "local"),
			Endpoint:  getEnv("MINIO_ENDPOINT", "http://localhost:9000"),
			AccessKey: getEnv("MINIO_ACCESS_KEY", ""),
			SecretKey: getEnv("MINIO_SECRET_KEY", ""),
			Bucket:    getEnv("MINIO_BUCKET", "app-uploads"),
			Region:    getEnv("MINIO_REGION", "us-east-1"),
			UseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
			PublicURL: getEnv("MINIO_PUBLIC_URL", ""),
		},

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GithubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GithubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),

		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		MailFrom:     getEnv("MAIL_FROM", "noreply@app.dev"),

		AIGatewayAPIKey: getEnv("AI_GATEWAY_API_KEY", ""),
		AIGatewayModel:  getEnv("AI_GATEWAY_MODEL", "anthropic/claude-3-sonnet"),
		AIGatewayURL:    getEnv("AI_GATEWAY_URL", "https://ai-gateway.vercel.sh/v1"),

		CORSOrigins: strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"), ","),

		GORMStudioEnabled:  getEnv("GORM_STUDIO_ENABLED", "true") == "true",
		GORMStudioUsername: getEnv("GORM_STUDIO_USERNAME", "admin"),
		GORMStudioPassword: getEnv("GORM_STUDIO_PASSWORD", "studio"),

		PulseEnabled:  getEnv("PULSE_ENABLED", "true") == "true",
		PulseUsername: getEnv("PULSE_USERNAME", "admin"),
		PulsePassword: getEnv("PULSE_PASSWORD", "pulse"),

		SentinelEnabled:   getEnv("SENTINEL_ENABLED", "true") == "true",
		SentinelUsername:  getEnv("SENTINEL_USERNAME", "admin"),
		SentinelPassword:  getEnv("SENTINEL_PASSWORD", "sentinel"),
		SentinelSecretKey: getEnv("SENTINEL_SECRET_KEY", ""),

		TOTPIssuer: getEnv("TOTP_ISSUER", "app"),
	}

	return cfg, nil
}

// IsDevelopment returns true if the app is running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.AppEnv == "development"
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		log.Printf("Warning: invalid duration %q, using default 15m: %v", s, err)
		return 15 * time.Minute
	}
	return d
}
