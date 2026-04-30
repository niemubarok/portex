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

	r.POST("/api/test-upload", func(c *gin.Context) {
		log.Printf("[TEST] Received Content-Length: %d", c.Request.ContentLength)
		if err := c.Request.ParseMultipartForm(100 << 20); err != nil {
			log.Printf("[TEST] Error: %v", err)
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Success!"})
	})

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
		Description: "REST API built with PortEx.",
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

	// Registry
	r.GET("/r.json", uiRegistryHandler.GetRegistry)
	r.GET("/r/:name", uiRegistryHandler.GetComponent)

	// Public blog
	blogs := r.Group("/api/blogs")
	{
		blogs.GET("", blogHandler.ListPublished)
		blogs.GET("/:slug", blogHandler.GetBySlug)
	}

	// Public auth
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
	}

	// OAuth2
	oauthGroup := auth.Group("/oauth")
	{
		oauthGroup.GET("/:provider", authHandler.OAuthBegin)
		oauthGroup.GET("/:provider/callback", authHandler.OAuthCallback)
	}

	auth.POST("/totp/verify", totpHandler.Verify)
	auth.POST("/totp/backup-codes/verify", totpHandler.VerifyBackupCode)

	r.GET("/verify/:id", documentHandler.Verify)

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.Auth(db, authService))
	{
		protected.GET("/auth/me", authHandler.Me)
		protected.POST("/auth/logout", authHandler.Logout)

		protected.POST("/auth/totp/setup", totpHandler.Setup)
		protected.POST("/auth/totp/enable", totpHandler.Enable)
		protected.POST("/auth/totp/disable", totpHandler.Disable)
		protected.GET("/auth/totp/status", totpHandler.Status)

		protected.GET("/users/:id", userHandler.GetByID)

		protected.POST("/uploads", uploadHandler.Create)
		protected.POST("/uploads/presign", uploadHandler.Presign)
		protected.POST("/uploads/complete", uploadHandler.CompleteUpload)
		protected.GET("/uploads", uploadHandler.List)
		protected.GET("/uploads/:id", uploadHandler.GetByID)
		protected.DELETE("/uploads/:id", uploadHandler.Delete)

		protected.POST("/ai/complete", aiHandler.Complete)
		protected.POST("/ai/chat", aiHandler.Chat)
		protected.POST("/ai/stream", aiHandler.Stream)

		protected.GET("/ui-components", uiRegistryHandler.ListComponents)
		protected.GET("/ui-components/:name", uiRegistryHandler.GetComponentDetail)

		protected.GET("/documents", documentHandler.List)
		protected.GET("/documents/:id", documentHandler.GetByID)
		protected.POST("/documents", documentHandler.Create)
		protected.PUT("/documents/:id", documentHandler.Update)
		protected.POST("/documents/:id/approve", documentHandler.Approve)
		protected.GET("/documents/:id/download", documentHandler.Download)

		auditLogs := protected.Group("/audit_logs")
		auditLogs.Use(middleware.RequireRole("ADMIN", "AUDITOR", "MANAGER", "OFFICER"))
		{
			auditLogs.GET("", auditLogHandler.List)
			auditLogs.GET("/:id", auditLogHandler.GetByID)
		}

		protected.GET("/settings", settingHandler.GetList)
	}

	profile := protected.Group("/profile")
	{
		profile.GET("", userHandler.GetProfile)
		profile.PUT("", userHandler.UpdateProfile)
		profile.DELETE("", userHandler.DeleteProfile)
	}

	admin := r.Group("/api")
	admin.Use(middleware.Auth(db, authService))
	admin.Use(middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", userHandler.List)
		admin.POST("/users", userHandler.Create)
		admin.PUT("/users/:id", userHandler.Update)
		admin.DELETE("/users/:id", userHandler.Delete)

		admin.GET("/admin/blogs", blogHandler.List)
		admin.POST("/admin/blogs", blogHandler.Create)
		admin.PUT("/admin/blogs/:id", blogHandler.Update)
		admin.DELETE("/admin/blogs/:id", blogHandler.Delete)

		admin.POST("/admin/ui-components", uiRegistryHandler.CreateComponent)
		admin.PUT("/admin/ui-components/:name", uiRegistryHandler.UpdateComponent)
		admin.DELETE("/admin/ui-components/:name", uiRegistryHandler.DeleteComponent)

		admin.DELETE("/documents/:id", documentHandler.Delete)
		admin.DELETE("/audit_logs/:id", auditLogHandler.Delete)
		admin.PUT("/settings", settingHandler.Update)
	}

	return r
}
