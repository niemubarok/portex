package routes

import (
	"log"
	"net/http"

	"github.com/MUKE-coder/gin-docs/gindocs"
	"github.com/MUKE-coder/gorm-studio/studio"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/ai"
	"app/apps/api/internal/config"
	"app/apps/api/internal/handlers"
	"app/apps/api/internal/mail"
	"app/apps/api/internal/middleware"
	"app/apps/api/internal/models"
	"app/apps/api/internal/services"
	"app/apps/api/internal/storage"
)

// Services holds all Phase 4 services for dependency injection.
type Services struct {
	Storage *storage.Storage
	Mailer  *mail.Mailer
	AI      *ai.AI
}

// Setup configures all routes and returns the Gin engine.
func Setup(db *gorm.DB, cfg *config.Config, svc *Services) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(middleware.Maintenance())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.MaxBodySize(100 << 20)) // 100MB max request body
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.Gzip())

	// Run auto-migration
	if err := models.Migrate(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Mount GORM Studio
	if cfg.GORMStudioEnabled {
		studioCfg := studio.Config{
			Prefix: "/studio",
		}
		if cfg.GORMStudioUsername != "" && cfg.GORMStudioPassword != "" {
			studioCfg.AuthMiddleware = gin.BasicAuth(gin.Accounts{
				cfg.GORMStudioUsername: cfg.GORMStudioPassword,
			})
		}
		studio.Mount(r, db, []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}}, studioCfg)
		log.Println("GORM Studio mounted at /studio")
	}

	// API Documentation
	gindocs.Mount(r, db, gindocs.Config{
		Title:       cfg.AppName + " API",
		Description: "REST API built with PortEx",
		Version:     "1.0.0",
		UI:          gindocs.UIScalar,
		ScalarTheme: "kepler",
		Models:      []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}},
		Auth: gindocs.AuthConfig{
			Type:         gindocs.AuthBearer,
			BearerFormat: "JWT",
		},
	})

	// Auth service
	authService := &services.AuthService{
		Secret:        cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	}

	// Handlers
	authHandler := &handlers.AuthHandler{
		DB:          db,
		AuthService: authService,
		Config:      cfg,
	}
	userHandler := &handlers.UserHandler{
		DB: db,
	}
	uploadHandler := &handlers.UploadHandler{
		DB:      db,
		Storage: svc.Storage,
	}
	aiHandler := &handlers.AIHandler{
		AI: svc.AI,
	}
	blogHandler := handlers.NewBlogHandler(db)
	uiRegistryHandler := handlers.NewUIRegistryHandler(db, cfg.AppURL)
	totpHandler := &handlers.TOTPHandler{
		DB:          db,
		AuthService: authService,
		Issuer:      cfg.TOTPIssuer,
	}
	
	auditService := &services.AuditService{DB: db}
	pdfService := &services.PDFService{}
	
	var storageSvc services.StorageService
	if cfg.Storage.Driver == "minio" || cfg.Storage.Driver == "s3" {
		var err error
		storageSvc, err = services.NewS3StorageService(
			cfg.Storage.Endpoint,
			cfg.Storage.AccessKey,
			cfg.Storage.SecretKey,
			cfg.Storage.Bucket,
			cfg.Storage.UseSSL,
			cfg.Storage.PublicURL,
		)
		if err != nil {
			log.Printf("Warning: fallback to local: %v", err)
			storageSvc = &services.LocalStorageService{BaseURL: cfg.AppURL}
		}
	} else {
		storageSvc = &services.LocalStorageService{BaseURL: cfg.AppURL}
	}

	documentHandler := &handlers.DocumentHandler{
		DB:         db,
		AuditSvc:   auditService,
		PDFSvc:     pdfService,
		StorageSvc: storageSvc,
		Config:     cfg,
	}
	auditLogHandler := &handlers.AuditLogHandler{DB: db}
	settingHandler := &handlers.SettingHandler{DB: db}

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Routes...
	r.GET("/r.json", uiRegistryHandler.GetRegistry)
	r.GET("/r/:name", uiRegistryHandler.GetComponent)

	blogs := r.Group("/api/blogs")
	{
		blogs.GET("", blogHandler.ListPublished)
		blogs.GET("/:slug", blogHandler.GetBySlug)
	}

	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
	}

	auth.POST("/totp/verify", totpHandler.Verify)
	r.GET("/verify/:id", documentHandler.Verify)

	protected := r.Group("/api")
	protected.Use(middleware.Auth(db, authService))
	{
		protected.GET("/auth/me", authHandler.Me)
		protected.POST("/auth/logout", authHandler.Logout)
		protected.GET("/users/:id", userHandler.GetByID)
		protected.POST("/uploads", uploadHandler.Create)
		protected.GET("/uploads", uploadHandler.List)
		protected.POST("/ai/complete", aiHandler.Complete)
		protected.GET("/documents", documentHandler.List)
		protected.GET("/documents/:id", documentHandler.GetByID)
		protected.POST("/documents", documentHandler.Create)
		protected.PUT("/documents/:id", documentHandler.Update)
		protected.POST("/documents/:id/approve", documentHandler.Approve)
		protected.GET("/documents/:id/download", documentHandler.Download)

		auditLogs := protected.Group("/audit_logs")
		{
			auditLogs.GET("", auditLogHandler.List)
		}
		protected.GET("/settings", settingHandler.GetList)
	}

	admin := r.Group("/api")
	admin.Use(middleware.Auth(db, authService))
	admin.Use(middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", userHandler.List)
		admin.POST("/users", userHandler.Create)
		admin.PUT("/users/:id", userHandler.Update)
		admin.DELETE("/users/:id", userHandler.Delete)
		admin.DELETE("/documents/:id", documentHandler.Delete)
		admin.PUT("/settings", settingHandler.Update)
	}

	return r
}
